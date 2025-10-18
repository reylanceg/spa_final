# Relocated Content from Conceptual Framework

This document contains content that was removed from the Conceptual Framework section and should be placed in the appropriate thesis sections.

---

## FOR SECTION 3.3: SYSTEM ARCHITECTURE

### Detailed System Components with Technologies

#### Component 1: Presentation Layer
**Purpose**: Role-specific user interfaces  
**Technology**: HTML5, CSS3, JavaScript, Socket.IO Client  
**Implementation Details**:
- Four distinct interfaces: Customer, Therapist, Cashier, Monitor
- Client-side state management using LocalStorage
- Real-time event listeners for WebSocket notifications
- Responsive design for various screen sizes

**Relationships**: 
- Sends HTTP requests to Application Layer via RESTful endpoints
- Receives WebSocket events through Socket.IO client
- Renders data dynamically using JavaScript DOM manipulation
- Maintains client-side session state

---

#### Component 2: Application Layer
**Purpose**: Business rules and request processing  
**Technology**: Python 3.x, Flask 2.x, Flask-SocketIO, SQLAlchemy ORM  
**Implementation Details**:
- Flask blueprints for modular route organization
- Flask-SocketIO for WebSocket server implementation
- SQLAlchemy for database abstraction
- Werkzeug for password hashing and security utilities

**File Structure**:
```
app/
├── routes/
│   ├── customer.py      # Customer interface endpoints
│   ├── therapist.py     # Therapist interface endpoints
│   ├── cashier.py       # Cashier interface endpoints
│   └── monitor.py       # Monitor dashboard endpoints
├── models.py            # SQLAlchemy ORM models
├── socket_events.py     # Socket.IO event handlers
└── __init__.py          # Application factory
```

**Relationships**: 
- Receives HTTP requests from Presentation Layer
- Queries Data Layer using SQLAlchemy ORM
- Broadcasts WebSocket events to connected clients
- Enforces authentication via token validation

---

#### Component 3: Data Layer
**Purpose**: Persistent data storage with integrity  
**Technology**: MySQL 8.0, InnoDB Storage Engine  
**Implementation Details**:
- InnoDB for ACID-compliant transactions
- Row-level locking with `SELECT ... FOR UPDATE SKIP LOCKED`
- Foreign key constraints for referential integrity
- Indexed columns for query optimization

**Database Configuration**:
```python
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://user:pass@localhost/spa_db'
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_size': 10,
    'pool_recycle': 3600,
    'pool_pre_ping': True
}
```

**Relationships**: 
- Receives SQL queries from Application Layer via SQLAlchemy
- Returns query results as Python objects
- Enforces referential integrity through foreign key constraints
- Manages concurrent access through pessimistic locking

---

#### Component 4: Real-Time Communication Module
**Purpose**: Bidirectional, low-latency communication  
**Technology**: Socket.IO (WebSocket with fallback to long-polling)  
**Implementation Details**:
- WebSocket protocol for persistent connections
- Room-based broadcasting for targeted updates
- Automatic reconnection handling
- Event-based message passing

**Socket.IO Rooms**:
- `therapist_queue`: Queue updates for therapists
- `cashier_queue`: Payment notifications for cashiers
- `customer_{code}`: Individual customer updates
- `monitor_dashboard`: Real-time statistics for monitors

**Relationships**: 
- Bridges Application Layer and Presentation Layer
- Maintains persistent bidirectional connections
- Implements publish-subscribe pattern with rooms
- Handles connection lifecycle (connect, disconnect, reconnect)

---

#### Component 5: Authentication Module
**Purpose**: User authentication and session management  
**Technology**: Werkzeug password hashing, JWT-style token authentication  
**Implementation Details**:
- Werkzeug `generate_password_hash()` with pbkdf2:sha256
- Token-based authentication stored in browser LocalStorage
- Role-based access control (RBAC) for endpoints
- Session timeout after inactivity

**Security Features**:
```python
# Password hashing
password_hash = generate_password_hash(password, method='pbkdf2:sha256')

# Token generation
token = secrets.token_urlsafe(32)

# Role-based decorator
@require_role('therapist')
def therapist_only_route():
    pass
```

**Relationships**: 
- Validates credentials against Data Layer
- Issues authentication tokens to clients
- Enforces role-based access control on routes
- Manages session expiration

---

#### Component 6: Queue Management Module
**Purpose**: Customer queue management with concurrency control  
**Technology**: SQLAlchemy with raw SQL for locking, database transactions  
**Implementation Details**:
- Pessimistic locking to prevent race conditions
- `SELECT ... FOR UPDATE SKIP LOCKED` for concurrent claims
- State machine for transaction lifecycle
- Automatic queue position calculation

**Concurrency Control Example**:
```python
# Therapist claims next customer with pessimistic locking
transaction = db.session.execute(
    text("""
        SELECT * FROM transaction 
        WHERE status = 'in_queue' 
        ORDER BY selection_confirmed_at ASC 
        LIMIT 1 
        FOR UPDATE SKIP LOCKED
    """)
).fetchone()

if transaction:
    # Update within same transaction
    transaction.status = 'therapist_confirmed'
    transaction.therapist_id = therapist_id
    db.session.commit()
```

**Relationships**: 
- Queries Data Layer for queue state
- Updates transaction states atomically
- Broadcasts queue updates via Real-Time Communication Module
- Enforces mutual exclusion for concurrent therapist claims

---

#### Component 7: Payment Processing Module
**Purpose**: Payment transactions and financial records  
**Technology**: SQLAlchemy ORM, database transactions, validation logic  
**Implementation Details**:
- Transaction-based payment recording
- Amount validation against transaction total
- Change calculation
- Payment method tracking (cash, card, etc.)

**Payment Workflow**:
```python
# Atomic payment processing
with db.session.begin():
    # Create payment record
    payment = Payment(
        transaction_id=transaction.id,
        cashier_id=cashier_id,
        amount_paid=amount_paid,
        change=amount_paid - transaction.total_amount,
        payment_method=payment_method
    )
    db.session.add(payment)
    
    # Update transaction status
    transaction.status = 'paid'
    transaction.paid_at = datetime.now()
    
    # Commit atomically
    db.session.commit()
```

**Relationships**: 
- Retrieves transaction data from Data Layer
- Creates payment records atomically
- Validates payment amounts against transaction totals
- Broadcasts payment confirmations to all relevant clients

---

### Component Relationship Diagram (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Customer │  │Therapist │  │ Cashier  │  │ Monitor  │       │
│  │    UI    │  │    UI    │  │    UI    │  │    UI    │       │
│  │ (HTML/JS)│  │ (HTML/JS)│  │ (HTML/JS)│  │ (HTML/JS)│       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼─────────────┼─────────────┼─────────────┼──────────────┘
        │ HTTP/WS     │ HTTP/WS     │ HTTP/WS     │ HTTP/WS
┌───────▼─────────────▼─────────────▼─────────────▼──────────────┐
│                    APPLICATION LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Real-Time Communication (Socket.IO)              │  │
│  │  Rooms: therapist_queue, cashier_queue, customer_{code} │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │     Auth     │  │    Queue     │  │   Payment    │         │
│  │   Module     │  │  Management  │  │  Processing  │         │
│  │  (Werkzeug)  │  │(Pessimistic  │  │ (Validation) │         │
│  │              │  │   Locking)   │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Flask Blueprints (Routes/Controllers)            │  │
│  │  customer.py │ therapist.py │ cashier.py │ monitor.py   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              SQLAlchemy ORM (models.py)                  │  │
│  │  Transaction │ Service │ Therapist │ Payment │ etc.     │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ SQL Queries (via SQLAlchemy)
┌──────────────────────────▼───────────────────────────────────────┐
│                      DATA LAYER                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              MySQL 8.0 (InnoDB Engine)                   │   │
│  │  Tables: service_category, service, service_classification│  │
│  │          transaction, transaction_item, transaction_counter│ │
│  │          therapist, cashier, payment, room               │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**Figure 3.X**: Detailed Component Architecture with Technologies

---

## FOR SECTION 3.4: DATA FLOW DIAGRAM (DFD)

### Detailed Data Flows with Implementation

#### Flow 1: Customer Service Selection

**Process Description**:
The customer service selection flow transforms user service choices into a queued transaction record, notifying therapists in real-time.

**Detailed Steps**:

1. **Customer selects services** → Client-side cart (LocalStorage)
   - User browses service catalog
   - Clicks "Add to Cart" for desired services
   - JavaScript stores selections in `localStorage`
   - Cart displays selected items with total

2. **Customer confirms selection** → HTTP POST `/customer/confirm_selection`
   - User clicks "Confirm Selection"
   - JavaScript sends POST request with cart data
   - Request body: `{services: [{service_id, classification_id, quantity}]}`

3. **Server validates and creates transaction** → Database INSERT
   ```python
   # Create transaction record
   transaction = Transaction(
       status='in_queue',
       total_amount=calculate_total(cart_items),
       total_duration_minutes=calculate_duration(cart_items),
       selection_confirmed_at=datetime.now()
   )
   db.session.add(transaction)
   
   # Generate unique code
   counter = TransactionCounter.query.with_for_update().first()
   transaction.code = f"{counter.current_value:04d}"
   counter.current_value += 1
   
   # Create transaction items
   for item in cart_items:
       transaction_item = TransactionItem(
           transaction_id=transaction.id,
           service_id=item['service_id'],
           classification_id=item['classification_id'],
           quantity=item['quantity'],
           price=get_price(item),
           duration_minutes=get_duration(item)
       )
       db.session.add(transaction_item)
   
   db.session.commit()
   ```

4. **Server generates unique transaction code** → Sequential code from TransactionCounter
   - Locks TransactionCounter table
   - Retrieves current value
   - Increments counter
   - Assigns 4-digit code (e.g., "0001", "0042")

5. **Server emits WebSocket event** → Broadcasts to `therapist_queue` room
   ```python
   socketio.emit('new_customer', {
       'transaction_id': transaction.id,
       'code': transaction.code,
       'total_amount': transaction.total_amount,
       'duration': transaction.total_duration_minutes,
       'timestamp': transaction.selection_confirmed_at.isoformat()
   }, room='therapist_queue')
   ```

6. **Therapist clients update** → Real-time queue display
   - All connected therapists receive event
   - JavaScript updates queue table
   - New customer appears at bottom of queue
   - Audio notification plays (optional)

**Data Flow Diagram**:
```
Customer → [Select Services] → LocalStorage Cart
                                      │
                                      ▼
Customer → [Confirm] → HTTP POST /customer/confirm_selection
                                      │
                                      ▼
                         [Validate & Create Transaction]
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
            [Generate Code]                    [Create Items]
                    │                                   │
                    └─────────────────┬─────────────────┘
                                      ▼
                            [Commit to Database]
                                      │
                                      ▼
                    [Emit 'new_customer' via Socket.IO]
                                      │
                                      ▼
                        [Broadcast to therapist_queue]
                                      │
                                      ▼
                         Therapist UIs Update Queue
```

---

#### Flow 2: Therapist Service Delivery

**Process Description**:
Therapists claim customers from the queue using pessimistic locking to prevent race conditions when multiple therapists attempt simultaneous claims.

**Detailed Steps**:

1. **Therapist views queue** → HTTP GET `/therapist/queue`
   - Therapist opens dashboard
   - Server queries transactions with `status='in_queue'`
   - Returns sorted list (oldest first)

2. **Therapist clicks "Claim Next"** → HTTP POST `/therapist/claim_next`
   - JavaScript sends POST with therapist token
   - Request includes therapist authentication

3. **Server acquires pessimistic lock** → `SELECT ... FOR UPDATE SKIP LOCKED`
   ```python
   # Prevent race conditions with pessimistic locking
   transaction = db.session.execute(
       text("""
           SELECT * FROM transaction 
           WHERE status = 'in_queue' 
           ORDER BY selection_confirmed_at ASC 
           LIMIT 1 
           FOR UPDATE SKIP LOCKED
       """)
   ).fetchone()
   
   if not transaction:
       return jsonify({'error': 'No customers in queue'}), 404
   ```

4. **Server updates transaction state** → UPDATE with timestamp
   ```python
   # Update within same transaction (lock held)
   transaction.status = 'therapist_confirmed'
   transaction.therapist_id = therapist.id
   transaction.therapist_confirmed_at = datetime.now()
   db.session.commit()
   ```

5. **Server broadcasts update** → Multiple Socket.IO events
   ```python
   # Notify customer
   socketio.emit('status_update', {
       'status': 'therapist_confirmed',
       'therapist_name': therapist.name,
       'room': therapist.room
   }, room=f'customer_{transaction.code}')
   
   # Update therapist queue
   socketio.emit('customer_claimed', {
       'transaction_id': transaction.id,
       'therapist_id': therapist.id
   }, room='therapist_queue')
   
   # Notify claiming therapist
   socketio.emit('claim_success', {
       'transaction': transaction.to_dict()
   }, room=request.sid)
   ```

6. **UIs update in real-time**
   - Customer sees "Therapist Assigned: [Name]"
   - Other therapists see customer removed from queue
   - Claiming therapist sees customer in "My Customers" section

**Concurrency Scenario**:
```
Time    Therapist A                 Therapist B                 Database
----    -----------                 -----------                 --------
T1      Click "Claim Next"          -                          Queue: [C1, C2, C3]
T2      Lock acquired on C1         Click "Claim Next"         C1 LOCKED by A
T3      Update C1 status            Attempt lock on C1         C1 LOCKED (skip)
T4      Commit & release lock       Lock acquired on C2        C2 LOCKED by B
T5      -                           Update C2 status           C2 updated
T6      -                           Commit & release lock      Queue: [C3]

Result: A gets C1, B gets C2, no race condition
```

---

#### Flow 3: Payment Processing

**Process Description**:
After service completion, cashiers process payments with validation and atomic transaction recording.

**Detailed Steps**:

1. **Therapist finishes service** → HTTP POST `/therapist/finish_service`
   ```python
   transaction.status = 'awaiting_payment'
   transaction.service_finish_at = datetime.now()
   db.session.commit()
   
   # Notify cashiers
   socketio.emit('new_payment', {
       'transaction_id': transaction.id,
       'code': transaction.code,
       'amount': transaction.total_amount
   }, room='cashier_queue')
   ```

2. **Cashier sees payment queue** → Real-time WebSocket update
   - Cashier dashboard displays pending payments
   - Shows transaction code, amount, customer wait time

3. **Cashier claims payment** → HTTP POST `/cashier/claim_payment`
   ```python
   # Similar pessimistic locking
   transaction = db.session.execute(
       text("""
           SELECT * FROM transaction 
           WHERE status = 'awaiting_payment' 
           AND id = :id
           FOR UPDATE SKIP LOCKED
       """),
       {'id': transaction_id}
   ).fetchone()
   
   transaction.status = 'cashier_claimed'
   transaction.assigned_cashier_id = cashier.id
   transaction.cashier_claimed_at = datetime.now()
   db.session.commit()
   ```

4. **Cashier enters payment amount** → HTTP POST `/cashier/process_payment`
   ```python
   # Validate amount
   if amount_paid < transaction.total_amount:
       return jsonify({'error': 'Insufficient payment'}), 400
   
   # Atomic payment processing
   with db.session.begin():
       payment = Payment(
           transaction_id=transaction.id,
           cashier_id=cashier.id,
           amount_paid=amount_paid,
           change=amount_paid - transaction.total_amount,
           payment_method=payment_method,
           paid_at=datetime.now()
       )
       db.session.add(payment)
       
       transaction.status = 'paid'
       transaction.paid_at = datetime.now()
       
       db.session.commit()
   ```

5. **Server broadcasts completion** → Multiple notifications
   ```python
   # Notify customer
   socketio.emit('payment_complete', {
       'change': payment.change,
       'receipt_id': payment.id
   }, room=f'customer_{transaction.code}')
   
   # Update cashier queue
   socketio.emit('payment_processed', {
       'transaction_id': transaction.id
   }, room='cashier_queue')
   
   # Update monitor dashboard
   socketio.emit('transaction_complete', {
       'transaction': transaction.to_dict()
   }, room='monitor_dashboard')
   ```

6. **All UIs update**
   - Customer sees "Payment Complete - Thank You!"
   - Cashier queue removes transaction
   - Monitor dashboard updates statistics

**Data Flow Diagram**:
```
Therapist → [Finish Service] → Update status='awaiting_payment'
                                            │
                                            ▼
                              [Emit to cashier_queue]
                                            │
                                            ▼
Cashier → [View Queue] ← [WebSocket Update] ← Cashier Dashboard
                                            │
                                            ▼
Cashier → [Claim Payment] → Lock transaction (SKIP LOCKED)
                                            │
                                            ▼
Cashier → [Enter Amount] → Validate amount >= total
                                            │
                                            ▼
                              [Create Payment Record]
                                            │
                                            ▼
                              [Update status='paid']
                                            │
                                            ▼
                              [Commit Transaction]
                                            │
                                            ▼
                    [Broadcast to customer, cashier, monitor]
                                            │
                                            ▼
                              All UIs Update in Real-Time
```

---

## FOR SECTION 3.7: SYSTEM MODULES AND FUNCTIONS

### Detailed Module Descriptions with Code Examples

*(This content would supplement your existing System Modules section with implementation-level details)*

#### Module: Queue Management with Concurrency Control

**File**: `app/routes/therapist.py`

**Function**: `claim_next_customer()`

**Purpose**: Allows therapists to claim the next customer in queue with race condition prevention

**Implementation**:
```python
@therapist_bp.route('/claim_next', methods=['POST'])
@require_auth('therapist')
def claim_next_customer():
    therapist = get_current_therapist()
    
    # Use pessimistic locking to prevent race conditions
    transaction = db.session.execute(
        text("""
            SELECT * FROM transaction 
            WHERE status = 'in_queue' 
            ORDER BY selection_confirmed_at ASC 
            LIMIT 1 
            FOR UPDATE SKIP LOCKED
        """)
    ).fetchone()
    
    if not transaction:
        return jsonify({'error': 'No customers in queue'}), 404
    
    # Update within locked transaction
    transaction.status = 'therapist_confirmed'
    transaction.therapist_id = therapist.id
    transaction.therapist_confirmed_at = datetime.now()
    
    db.session.commit()
    
    # Broadcast updates
    socketio.emit('customer_claimed', {
        'transaction_id': transaction.id,
        'therapist_id': therapist.id
    }, room='therapist_queue')
    
    return jsonify({
        'success': True,
        'transaction': transaction.to_dict()
    })
```

**Concurrency Control Mechanism**:
- `FOR UPDATE`: Acquires row-level lock
- `SKIP LOCKED`: Skips locked rows instead of waiting
- Result: Multiple therapists can claim different customers simultaneously without conflicts

---

## SUMMARY OF RELOCATIONS

### Content Removed from Conceptual Framework:
1. ✅ Specific technology stack details (Flask, MySQL, Socket.IO, etc.)
2. ✅ Implementation code examples (SQL queries, Python code)
3. ✅ File structure and directory organization
4. ✅ Detailed data flow steps with HTTP endpoints
5. ✅ API endpoint specifications
6. ✅ Database configuration details
7. ✅ Socket.IO room names and event names

### Content Kept in Conceptual Framework:
1. ✅ Theoretical foundations (MVC, three-tier, event-driven)
2. ✅ High-level IPO model
3. ✅ Conceptual component relationships
4. ✅ Architectural paradigm explanations
5. ✅ Academic references and citations
6. ✅ Conceptual diagrams (without implementation details)

### Where to Place Relocated Content:
- **Section 3.3 (System Architecture)**: Component details, technology stack, file structure
- **Section 3.4 (Data Flow Diagram)**: Detailed flows with endpoints and code
- **Section 3.7 (System Modules)**: Function implementations and code examples
