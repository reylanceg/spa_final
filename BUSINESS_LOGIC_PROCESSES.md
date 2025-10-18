# Spa Management System: Business Logic Processes

## Overview
The spa management system implements a multi-role transaction workflow that coordinates customer service selection, therapist service delivery, and cashier payment processing through real-time event-driven communication.

---

## 1. Service Selection and Transaction Initialization

### Process: Customer Service Selection
**Trigger:** Customer confirms service selections via the customer interface

**Key Steps:**
1. Customer selects one or more services with specific classifications (pricing tier)
2. System creates a new `Transaction` record with status `selecting`
3. For each selected service:
   - Retrieves the `Service` and `ServiceClassification` records
   - Extracts pricing and duration from the classification
   - Creates a `TransactionItem` linking the service to the transaction
4. System generates a unique 4-digit transaction code (e.g., 0001, 0002)
5. Transaction totals are computed:
   - `total_amount`: Sum of all item prices
   - `total_duration_minutes`: Sum of all item durations
6. Transaction status transitions to `pending_therapist`

**Data Entities Involved:**
- `Transaction` (status: pending_therapist)
- `TransactionItem` (multiple items per transaction)
- `Service` and `ServiceClassification` (pricing and duration lookup)

**Real-time Notifications:**
- Therapist queue updated
- Monitor dashboard updated with new customer confirmation
- Customer receives transaction code and summary

**Business Rule:** Transaction code is generated sequentially using a `TransactionCounter` to ensure uniqueness and ordering.

---

## 2. Therapist Confirmation and Service Preparation

### Process: Therapist Claims Next Customer
**Trigger:** Therapist clicks "Confirm Next" button in therapist interface

**Key Steps:**
1. System authenticates the therapist via token or session
2. Queries for the oldest `Transaction` with status `pending_therapist` (FIFO queue)
3. Applies database-level row locking (`with_for_update(skip_locked=True)`) to prevent race conditions
4. Assigns the transaction to the therapist:
   - Sets `therapist_id` to current therapist
   - Sets `room_number` from therapist's assigned room
   - Records `therapist_confirmed_at` timestamp
5. Transaction status transitions to `therapist_confirmed`
6. Therapist joins a transaction-specific WebSocket room (`txn_{transaction_id}`)

**Data Entities Involved:**
- `Transaction` (status: therapist_confirmed)
- `Therapist` (authentication and room assignment)

**Real-time Notifications:**
- Therapist queue updated
- Monitor dashboard updated with therapist assignment
- Customer receives transaction update with therapist name and room

**Business Rule:** First-come-first-served queue ensures fair workload distribution among therapists.

---

## 3. Service Delivery Management

### Process 3A: Therapist Starts Service
**Trigger:** Therapist clicks "Start Service" button

**Key Steps:**
1. Retrieves the transaction by ID
2. Records service start timestamp (`service_start_at`)
3. Transaction status transitions to `in_service`

**Data Entities Involved:**
- `Transaction` (status: in_service)

**Real-time Notifications:**
- Monitor dashboard updated
- Customer receives transaction update

---

### Process 3B: Therapist Adds Additional Service (Mid-Service)
**Trigger:** Therapist adds a service while transaction is in `therapist_confirmed` or `in_service` status

**Key Steps:**
1. Retrieves the transaction and service by ID
2. Looks up the `ServiceClassification` to get pricing and duration
3. Creates a new `TransactionItem` for the additional service
4. Recomputes transaction totals:
   - Updates `total_amount` with new service price
   - Updates `total_duration_minutes` with new service duration
5. Persists changes to database

**Data Entities Involved:**
- `TransactionItem` (new item added)
- `Transaction` (totals recomputed)
- `Service` and `ServiceClassification` (pricing lookup)

**Real-time Notifications:**
- Customer receives updated transaction with new service and revised total
- Monitor dashboard updated

**Business Rule:** Therapists can dynamically add services during service delivery to accommodate customer requests or upsell opportunities.

---

### Process 3C: Therapist Removes Service Item
**Trigger:** Therapist removes a service item during service delivery

**Key Steps:**
1. Retrieves the `TransactionItem` by ID
2. Validates transaction status is `therapist_confirmed` or `in_service`
3. Deletes the item from the transaction
4. Recomputes transaction totals (removes item's price and duration)
5. Persists changes to database

**Data Entities Involved:**
- `TransactionItem` (deleted)
- `Transaction` (totals recomputed)

**Real-time Notifications:**
- Customer receives updated transaction with removed service and revised total
- Monitor dashboard updated

**Business Rule:** Items can only be removed before or during service delivery, not after completion.

---

### Process 3D: Therapist Finishes Service
**Trigger:** Therapist clicks "Finish Service" button

**Key Steps:**
1. Retrieves the transaction by ID
2. Records service completion timestamp (`service_finish_at`)
3. Transaction status transitions to `finished`
4. Transaction is now eligible for cashier payment processing

**Data Entities Involved:**
- `Transaction` (status: finished)

**Real-time Notifications:**
- Cashier queue updated (transaction now available for payment)
- Monitor dashboard updated with service completion
- Customer notified of service completion

**Business Rule:** Service must be marked as finished before payment processing can begin.

---

## 4. Payment Processing

### Process 4A: Cashier Claims Transaction for Payment
**Trigger:** Cashier clicks "Claim Next" button in cashier interface

**Key Steps:**
1. System authenticates the cashier via token or session
2. Queries for the oldest `Transaction` with status `finished` (FIFO queue)
3. Applies database-level row locking to prevent multiple cashiers claiming the same transaction
4. Assigns the transaction to the cashier:
   - Sets `assigned_cashier_id` to current cashier
   - Records `cashier_claimed_at` timestamp
5. Transaction status transitions to `awaiting_payment`

**Data Entities Involved:**
- `Transaction` (status: awaiting_payment)
- `Cashier` (authentication and counter assignment)

**Real-time Notifications:**
- Monitor dashboard updated with payment counter assignment
- Cashier queue updated

**Business Rule:** First-come-first-served queue ensures fair workload distribution among cashiers.

---

### Process 4B: Cashier Processes Payment
**Trigger:** Cashier enters amount paid and confirms payment

**Key Steps:**
1. System authenticates the cashier
2. Retrieves the transaction
3. Validates transaction status is `awaiting_payment` or `paying`
4. Calculates change:
   - `change_amount = amount_paid - amount_due`
5. Validates sufficient payment:
   - If `amount_paid < amount_due`, rejects payment with error message
6. Creates a `Payment` record:
   - Links payment to transaction and cashier
   - Records `amount_due`, `amount_paid`, `change_amount`
   - Sets payment method to "cash" (fixed)
   - Records `created_at` timestamp
7. Transaction status transitions to `paid`
8. Records payment completion timestamp (`paid_at`)

**Data Entities Involved:**
- `Payment` (new payment record created)
- `Transaction` (status: paid)
- `Cashier` (payment processor)

**Real-time Notifications:**
- Monitor dashboard updated with payment completion
- Cashier queue updated
- Cashier receives payment confirmation with transaction details

**Business Rule:** Payment must be greater than or equal to the transaction total. Change is automatically calculated and displayed.

---

## 5. Transaction State Machine

```
selecting
    ↓
pending_therapist
    ↓
therapist_confirmed ← (therapist claims)
    ↓
in_service ← (therapist starts)
    ↓
finished ← (therapist finishes)
    ↓
awaiting_payment ← (cashier claims)
    ↓
paying
    ↓
paid ← (payment processed)
```

---

## 6. Key Business Rules and Constraints

### Transaction Code Generation
- Codes are generated sequentially using a `TransactionCounter` table
- Format: 4-digit zero-padded integer (0001, 0002, ..., 9999)
- Ensures unique identification and chronological ordering

### Queue Management
- **Therapist Queue:** Transactions in `pending_therapist` status, ordered by `selection_confirmed_at` (FIFO)
- **Cashier Queue:** Transactions in `finished` status, ordered by `service_finish_at` (FIFO)
- Database-level row locking prevents race conditions when multiple workers claim from the same queue

### Service Modification Rules
- Services can only be added during `therapist_confirmed` or `in_service` statuses
- Services can only be removed during `therapist_confirmed` or `in_service` statuses
- Transaction totals are automatically recomputed after any modification

### Payment Rules
- Payment method is fixed to "cash" (no selection required)
- Change is automatically calculated as `amount_paid - amount_due`
- Payment is rejected if `amount_paid < amount_due`
- Only one payment record per transaction (1:1 relationship)

### Authentication and Authorization
- Therapists authenticate via token or session and can only access their own transactions
- Cashiers authenticate via token or session and can only process assigned transactions
- Each user has a unique `auth_token` with optional expiration

### Real-time Synchronization
- All state changes broadcast to relevant WebSocket rooms:
  - `therapist_queue`: All therapists monitoring for new customers
  - `cashier_queue`: All cashiers monitoring for finished services
  - `monitor`: Dashboard monitoring all transactions
  - `txn_{transaction_id}`: Specific transaction participants (customer, therapist, cashier)

---

## 7. Data Consistency Mechanisms

### Timestamp Recording
All critical state transitions record timestamps:
- `created_at`: Transaction creation
- `selection_confirmed_at`: Customer confirms selection
- `therapist_confirmed_at`: Therapist claims transaction
- `service_start_at`: Service begins
- `service_finish_at`: Service completes
- `cashier_claimed_at`: Cashier claims for payment
- `paid_at`: Payment processed

### Cascade Deletion
- Deleting a transaction cascades to delete all associated `TransactionItem` and `Payment` records
- Ensures referential integrity

### Computed Fields
- `total_amount`: Automatically computed from sum of transaction items
- `total_duration_minutes`: Automatically computed from sum of transaction items
- `change_amount`: Automatically computed during payment processing

---

## 8. Role-Based Workflows

### Customer Workflow
1. Selects services and classifications
2. Confirms selection (generates transaction code)
3. Receives real-time updates on therapist assignment and service progress
4. Views final transaction total and payment status

### Therapist Workflow
1. Claims next customer from queue
2. Views transaction details (services, duration, total)
3. Can add/remove services during service delivery
4. Marks service as started and finished
5. Receives real-time updates on customer and payment status

### Cashier Workflow
1. Claims next finished transaction from queue
2. Views transaction details (services, therapist, total amount)
3. Enters amount paid by customer
4. Receives payment confirmation with change amount
5. Receives real-time updates on transaction queue

### Monitor/Dashboard Workflow
1. Receives real-time updates on all transactions
2. Displays transaction status across all stages
3. Shows therapist and cashier assignments
4. Tracks service start/finish and payment completion
