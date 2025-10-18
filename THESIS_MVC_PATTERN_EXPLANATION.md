# MVC Pattern in the SPA Management System

## What is MVC?

MVC stands for **Model-View-Controller**. It's a way of organizing a system by separating it into three main parts, each with its own specific job. This separation makes the system easier to build, maintain, and update.

---

## The Three Parts

### 1. VIEW (User Interface)
**What It Is**: Everything the user sees and interacts with

**In This System**:
- Customer interface for selecting services
- Therapist dashboard for managing the queue
- Cashier screen for processing payments
- Monitor dashboard for viewing statistics
- HTML templates that display information
- Real-time updates that refresh automatically

**Example**: When a customer looks at the service menu and clicks to add a massage to their cart, they're interacting with the View.

---

### 2. CONTROLLER (Processing Logic)
**What It Is**: The "brain" that handles user actions and coordinates everything

**In This System**:
- Route handlers that receive user requests
- Business logic that applies spa rules
- Request validation to check if actions are allowed
- Queue management to assign customers to therapists
- Payment processing to handle transactions
- Authentication to verify user identities
- WebSocket events for real-time updates

**Example**: When a therapist clicks "Claim Customer," the Controller checks if that customer is still available, assigns them if so, and tells the View to update.

---

### 3. MODEL (Data)
**What It Is**: All the data and rules about how data should be stored and retrieved

**In This System**:
- Transaction model (customer service records)
- Service model (available services and prices)
- User model (therapist and cashier accounts)
- Payment model (payment records)
- Database operations (saving and retrieving data)
- Data validation (ensuring data is correct)
- Business rules (e.g., "every payment must have a transaction")

**Example**: When a payment is processed, the Model saves the payment information to the database and links it to the correct transaction.

---

## How They Work Together

Here's what happens when a user does something in the system:

```
1. USER interacts with VIEW
   ↓
2. VIEW sends the action to CONTROLLER
   ↓
3. CONTROLLER processes the request and updates MODEL
   ↓
4. MODEL queries or saves data to DATABASE
   ↓
5. MODEL returns data to CONTROLLER
   ↓
6. CONTROLLER updates VIEW with new data
   ↓
7. USER sees the updated screen
```

---

## Real-World Example: Customer Booking a Service

Let's see how MVC works when a customer books a massage:

**Step 1**: Customer clicks "Add Massage" on their screen  
→ **VIEW** captures this action

**Step 2**: VIEW sends "add massage to cart" request  
→ **CONTROLLER** receives the request

**Step 3**: CONTROLLER validates the request and tells MODEL to save it  
→ **MODEL** creates a transaction record

**Step 4**: MODEL saves the transaction to the database  
→ **DATABASE** stores the information

**Step 5**: MODEL confirms the save was successful  
→ **CONTROLLER** receives confirmation

**Step 6**: CONTROLLER tells VIEW to update the cart display  
→ **VIEW** shows the massage in the customer's cart

**Step 7**: Customer sees their updated cart with the massage  
→ **USER** sees the result

---

## Why Use MVC?

### Benefit 1: Separation of Concerns
Each part has one clear job. The View doesn't need to know how data is stored, and the Model doesn't need to know how screens look.

### Benefit 2: Easy to Update
You can change the user interface without touching the database code, or update business rules without redesigning screens.

### Benefit 3: Easier Testing
Each part can be tested separately. You can test if the Model saves data correctly without needing to test the entire user interface.

### Benefit 4: Team Collaboration
Different developers can work on different parts at the same time without interfering with each other.

### Benefit 5: Code Reusability
The same Model can be used by different Views. For example, both the therapist and cashier screens can use the same Transaction model.

---

## MVC in Action: Queue Management

Here's another example showing how MVC handles queue management:

| Component | Role in Queue Management |
|-----------|-------------------------|
| **VIEW** | Displays the queue list to therapists<br>Shows "Claim" button for each customer<br>Updates queue in real-time |
| **CONTROLLER** | Receives "claim customer" request<br>Checks if customer is still available<br>Applies locking to prevent conflicts<br>Broadcasts update to all therapists |
| **MODEL** | Updates customer status in database<br>Records therapist assignment<br>Validates state transition<br>Returns updated queue data |

**Result**: When one therapist claims a customer, all other therapists immediately see that customer removed from their queue, preventing double-booking.

---

## Summary

The MVC pattern organizes the SPA Management System into three clear parts:

- **VIEW**: What users see and interact with
- **CONTROLLER**: The logic that processes actions and coordinates
- **MODEL**: The data and rules for storing information

This separation makes the system:
- ✓ Easier to understand
- ✓ Simpler to maintain
- ✓ More flexible for changes
- ✓ Better organized for team development

By following the MVC pattern, the system ensures that each part does its job well without interfering with the others.
