# CHAPTER 3: METHODOLOGY
## 3.4 System Modules and Functions

### 3.4.1 Overview

The SPA Management System is organized into five primary functional modules, each designed to address specific operational requirements within the spa service delivery workflow. These modules operate cohesively through a centralized application core, leveraging real-time communication protocols to maintain synchronized state across all system actors. The modular architecture adheres to the principle of separation of concerns, enabling independent development, testing, and maintenance of discrete functional units while preserving system-wide integration.

The system modules are categorized based on user roles and operational functions: (1) Customer Service Selection Module, (2) Therapist Service Management Module, (3) Cashier Payment Processing Module, (4) Real-Time Monitoring Module, and (5) Authentication and Authorization Module. Each module encapsulates specific business logic, user interface components, and data access patterns relevant to its designated function.

---

### 3.4.2 Module Architecture

The system implements a **blueprint-based modular architecture** using Flask's Blueprint pattern, which provides namespace isolation and route organization. Each module is implemented as a self-contained blueprint with dedicated route handlers, templates, and business logic components.

**Module Organization Structure:**

```
app/
├── routes/
│   ├── customer.py          # Customer Module
│   ├── therapist.py         # Therapist Module
│   ├── cashier.py           # Cashier Module
│   ├── monitor.py           # Monitor Module
│   ├── monitor_snapshot.py  # Monitor Data API
│   └── auth.py              # Authentication Module
├── templates/
│   ├── services1.html       # Customer interface
│   ├── services2.html       # Alternative customer interface
│   ├── therapist.html       # Therapist dashboard
│   ├── cashier.html         # Cashier dashboard
│   ├── monitor.html         # Monitor dashboard
│   └── login_*.html         # Authentication interfaces
├── socketio_events.py       # Real-time event handlers
├── models.py                # Data models
└── utils/
    └── auth_helpers.py      # Authentication utilities
```

---

### 3.4.3 Customer Service Selection Module

#### 3.4.3.1 Module Purpose

The Customer Service Selection Module provides the customer-facing interface for browsing available spa services, selecting desired treatments, and initiating service requests. This module serves as the entry point for customer transactions and establishes the initial transaction record that flows through subsequent system modules.

#### 3.4.3.2 Module Components

**1. Route Handler (`routes/customer.py`)**

The customer blueprint implements the following HTTP endpoints:

| Endpoint | Method | Function | Description |
|----------|--------|----------|-------------|
| `/` | GET | `home_page()` | Renders landing page with service overview |
| `/about` | GET | `about_page()` | Displays spa information and policies |
| `/services1` | GET | `customer_page1()` | Primary service selection interface |
| `/services2` | GET | `customer_page2()` | Alternative service selection interface |
| `/api/services` | GET | `api_services()` | Returns JSON service catalog with classifications |

**2. User Interface Templates**

- **`services1.html`**: Grid-based service catalog with category filtering
- **`services2.html`**: Alternative layout for service browsing
- **`home.html`**: Landing page with featured services
- **`about.html`**: Informational content about spa services

**3. Client-Side Logic**

The module employs vanilla JavaScript for interactive functionality:

- **Service Catalog Rendering**: Dynamically loads services from `/api/services` endpoint
- **Shopping Cart Management**: Maintains selected services in browser LocalStorage
- **Service Classification Selection**: Allows customers to choose pricing tiers (e.g., 60min/90min/120min)
- **Real-Time Price Calculation**: Computes total cost as services are added/removed
- **Socket.IO Integration**: Emits `customer_confirm_selection` event upon confirmation

#### 3.4.3.3 Core Functions

**Function 1: Service Catalog Retrieval**

```python
@customer_bp.get("/api/services")
def api_services():
    """
    Retrieves all available services with their classifications.
    
    Returns:
        JSON array of service objects containing:
        - Service ID and name
        - Classification ID, name, price, duration
        - Category and description
    """
    services = Service.query.order_by(Service.service_name.asc()).all()
    result = []
    for s in services:
        for classification in s.classifications:
            result.append({
                "id": s.id,
                "classification_id": classification.id,
                "name": s.service_name,
                "classification_name": classification.classification_name,
                "price": classification.price,
                "duration_minutes": classification.duration_minutes,
                "category": s.category.category_name if s.category else "Uncategorized",
                "description": s.description or "No description available"
            })
    return jsonify(result)
```

**Function 2: Service Selection Confirmation**

Implemented as Socket.IO event handler in `socketio_events.py`:

```python
@socketio.on("customer_confirm_selection")
def customer_confirm_selection(data):
    """
    Processes customer service selection and creates transaction.
    
    Parameters:
        data (dict): Contains selected service items with classifications
    
    Workflow:
        1. Creates new Transaction with status 'pending_therapist'
        2. Generates unique 4-digit transaction code
        3. Creates TransactionItem records for each selected service
        4. Computes total amount and duration
        5. Broadcasts update to therapist queue
        6. Returns transaction details to customer
    """
```

#### 3.4.3.4 Data Flow

1. Customer accesses service selection page via HTTP GET request
2. JavaScript fetches service catalog from `/api/services` endpoint
3. Customer adds services to cart (stored in LocalStorage)
4. Customer confirms selection, triggering Socket.IO event
5. Server creates Transaction record with status `pending_therapist`
6. Server generates sequential transaction code via `TransactionCounter`
7. Server creates TransactionItem records for each selected service
8. Server broadcasts update to therapist queue room
9. Server returns transaction details to customer for confirmation display

---

### 3.4.4 Therapist Service Management Module

#### 3.4.4.1 Module Purpose

The Therapist Service Management Module enables therapists to claim pending customer requests, manage service delivery, track treatment progress, and finalize service completion. This module implements queue-based customer assignment with concurrency control to prevent multiple therapists from claiming the same customer.

#### 3.4.4.2 Module Components

**1. Route Handler (`routes/therapist.py`)**

| Endpoint | Method | Function | Description |
|----------|--------|----------|-------------|
| `/therapist` | GET | `therapist_page()` | Main therapist dashboard |
| `/therapist/service-management` | GET | `service_management_page()` | Service history view |
| `/therapist/toggle-room-status` | POST | `toggle_room_status()` | Toggle room availability |
| `/therapist/finished-transactions` | GET | `get_finished_transactions()` | Retrieve service history |

**2. User Interface**

- **`therapist.html`**: Real-time queue display, customer claiming interface, service timer
- **`service_management.html`**: Historical transaction view with service details

**3. Socket.IO Event Handlers**

| Event | Function | Description |
|-------|----------|-------------|
| `therapist_subscribe` | `therapist_subscribe()` | Subscribe to therapist queue room |
| `therapist_confirm_next` | `therapist_confirm_next()` | Claim next pending customer |
| `therapist_start_service` | `therapist_start_service()` | Begin service delivery |
| `therapist_add_service` | `therapist_add_service()` | Add service during treatment |
| `therapist_remove_item` | `therapist_remove_item()` | Remove service item |
| `therapist_finish_service` | `therapist_finish_service()` | Complete service |
| `therapist_get_current_transaction` | `therapist_get_current_transaction()` | Retrieve active transaction |

#### 3.4.4.3 Core Functions

**Function 1: Customer Queue Claiming with Concurrency Control**

```python
@socketio.on("therapist_confirm_next")
def therapist_confirm_next(data):
    """
    Assigns next pending customer to authenticated therapist.
    
    Concurrency Control:
        - Uses SELECT ... FOR UPDATE SKIP LOCKED
        - Prevents race conditions in multi-therapist environment
        - Ensures only one therapist claims each customer
    
    Workflow:
        1. Authenticates therapist via token or session
        2. Queries oldest pending transaction with row-level lock
        3. Assigns therapist and room to transaction
        4. Updates status to 'therapist_confirmed'
        5. Records confirmation timestamp
        6. Broadcasts queue update to all therapists
        7. Returns transaction details to claiming therapist
    """
```

**Function 2: Service Timer Management**

```python
@socketio.on("therapist_start_service")
def therapist_start_service(data):
    """
    Initiates service delivery and starts timer.
    
    Parameters:
        data (dict): Contains transaction_id
    
    Actions:
        - Updates transaction status to 'in_service'
        - Records service_start_at timestamp
        - Broadcasts status update to monitor
        - Enables service duration tracking
    """
```

**Function 3: Dynamic Service Modification**

```python
@socketio.on("therapist_add_service")
def therapist_add_service(data):
    """
    Adds additional service during active treatment.
    
    Parameters:
        data (dict): transaction_id, service_id, service_classification_id
    
    Workflow:
        1. Validates transaction and service existence
        2. Retrieves price and duration from classification
        3. Creates new TransactionItem
        4. Recomputes transaction totals
        5. Updates customer display in real-time
        6. Broadcasts update to monitor
    """
```

**Function 4: Room Status Management**

```python
@therapist_bp.post("/therapist/toggle-room-status")
def toggle_room_status():
    """
    Toggles therapist room between 'available' and 'preparing' states.
    
    Purpose:
        - Indicates therapist availability for new customers
        - 'preparing' status signals room setup in progress
        - 'available' status enables customer assignment
    
    Returns:
        JSON response with new status and button text
    """
```

#### 3.4.4.4 Transaction History Retrieval

```python
@therapist_bp.get("/therapist/finished-transactions")
def get_finished_transactions():
    """
    Retrieves historical transactions for authenticated therapist.
    
    Query Criteria:
        - Therapist ID matches authenticated user
        - Status is 'finished' or 'paid'
        - Ordered by service_finish_at descending
        - Limited to 50 most recent transactions
    
    Returns:
        JSON array with transaction details and service items
    """
```

---

### 3.4.5 Cashier Payment Processing Module

#### 3.4.5.1 Module Purpose

The Cashier Payment Processing Module manages the final stage of the transaction lifecycle, enabling cashiers to claim finished transactions, process payments, calculate change, and generate payment records. This module ensures accurate financial transaction processing with validation and audit trail generation.

#### 3.4.5.2 Module Components

**1. Route Handler (`routes/cashier.py`)**

| Endpoint | Method | Function | Description |
|----------|--------|----------|-------------|
| `/cashier` | GET | `cashier_page()` | Main cashier dashboard |
| `/cashier/payment-management` | GET | `payment_management_page()` | Payment history view |
| `/cashier/payment-history` | GET | `get_payment_history()` | Retrieve processed payments |

**2. User Interface**

- **`cashier.html`**: Real-time finished transaction queue, payment processing interface
- **`payment_management.html`**: Historical payment records with transaction details
- **`receipt.html`**: Printable receipt template

**3. Socket.IO Event Handlers**

| Event | Function | Description |
|-------|----------|-------------|
| `cashier_subscribe` | `cashier_subscribe()` | Subscribe to cashier queue room |
| `cashier_claim_next` | `cashier_claim_next()` | Claim next finished transaction |
| `cashier_pay` | `cashier_pay()` | Process payment |
| `cashier_get_current_transaction` | `cashier_get_current_transaction()` | Retrieve active transaction |

#### 3.4.5.3 Core Functions

**Function 1: Transaction Claiming**

```python
@socketio.on("cashier_claim_next")
def cashier_claim_next(data):
    """
    Assigns next finished transaction to authenticated cashier.
    
    Concurrency Control:
        - Uses SELECT ... FOR UPDATE SKIP LOCKED
        - Prevents multiple cashiers claiming same transaction
    
    Workflow:
        1. Authenticates cashier via token or session
        2. Queries oldest finished transaction with row-level lock
        3. Assigns cashier to transaction
        4. Updates status to 'awaiting_payment'
        5. Records cashier_claimed_at timestamp
        6. Broadcasts queue update
        7. Returns transaction details to cashier
    """
```

**Function 2: Payment Processing with Validation**

```python
@socketio.on("cashier_pay")
def cashier_pay(data):
    """
    Processes customer payment and completes transaction.
    
    Parameters:
        data (dict): transaction_id, amount_paid
    
    Validation:
        - Verifies amount_paid >= amount_due
        - Ensures transaction status is 'awaiting_payment' or 'paying'
        - Authenticates cashier
    
    Workflow:
        1. Validates payment amount sufficiency
        2. Calculates change amount
        3. Creates Payment record with audit trail
        4. Updates transaction status to 'paid'
        5. Records paid_at timestamp
        6. Broadcasts completion to monitor
        7. Returns payment confirmation with change amount
    
    Payment Record Fields:
        - transaction_id: Links to transaction
        - cashier_id: Records processing cashier
        - amount_due: Total transaction amount
        - amount_paid: Customer payment
        - change_amount: Calculated change
        - method: Payment method (default: 'cash')
        - created_at: Payment timestamp
    """
```

**Function 3: Payment History Retrieval**

```python
@cashier_bp.get("/cashier/payment-history")
def get_payment_history():
    """
    Retrieves payment history for authenticated cashier.
    
    Query Criteria:
        - Cashier ID matches authenticated user
        - Ordered by created_at descending
        - Limited to 50 most recent payments
    
    Returns:
        JSON array containing:
        - Payment details (amount, change, method)
        - Associated transaction information
        - Service items included in transaction
        - Therapist and room information
    """
```

---

### 3.4.6 Real-Time Monitoring Module

#### 3.4.6.1 Module Purpose

The Real-Time Monitoring Module provides a centralized dashboard for visualizing system-wide operational status, including customer queue states, therapist activities, room occupancy, cashier workload, and transaction flow. This module aggregates data from all other modules to present a comprehensive real-time view of spa operations.

#### 3.4.6.2 Module Components

**1. Route Handlers**

- **`routes/monitor.py`**: Renders monitor dashboard page
- **`routes/monitor_snapshot.py`**: Provides RESTful API endpoints for real-time data

**2. API Endpoints**

| Endpoint | Method | Function | Description |
|----------|--------|----------|-------------|
| `/monitor_snapshot/` | GET | `monitor_snapshot()` | Transaction queue snapshot |
| `/room_status/` | GET | `room_status()` | Room occupancy and status |
| `/cashier_status/` | GET | `cashier_status()` | Cashier workload distribution |

**3. User Interface**

- **`monitor.html`**: Multi-section dashboard with real-time updates

#### 3.4.6.3 Core Functions

**Function 1: Transaction Queue Snapshot**

```python
@snapshot_bp.get('/monitor_snapshot/')
def monitor_snapshot():
    """
    Retrieves categorized transaction queues for dashboard display.
    
    Queue Categories:
        - WAITING: Transactions with status 'pending_therapist'
        - SERVING: Transactions with status 'therapist_confirmed' or 'in_service'
        - FINISHED: Transactions with status 'finished'
        - COUNTER: Transactions with status 'awaiting_payment'
    
    Returns:
        JSON object with four arrays, each containing:
        - Transaction code and ID
        - Therapist name and room number
        - Total amount and duration
        - Assigned cashier and counter
        - Service start timestamp (for timer calculation)
        - Selected services with classifications
    """
```

**Function 2: Room Status Monitoring**

```python
@snapshot_bp.get('/room_status/')
def room_status():
    """
    Retrieves real-time status of all treatment rooms.
    
    Status Determination Logic:
        1. Check for in_service transaction → status: 'on_going_service'
        2. Check for therapist_confirmed transaction → status: 'occupied'
        3. Otherwise use room's base status ('available' or 'preparing')
    
    Returns:
        JSON array with room information:
        - room_number: Room identifier
        - status: Current operational status
        - transaction_code: Active transaction code (if any)
        - service_start_at: Service start timestamp
        - total_duration_minutes: Expected service duration
        - transaction_id: Active transaction ID
    """
```

**Function 3: Cashier Workload Distribution**

```python
@snapshot_bp.get('/cashier_status/')
def cashier_status():
    """
    Retrieves cashier availability and workload.
    
    Query Criteria:
        - Active cashiers only
        - Includes transactions with status 'awaiting_payment' or 'paying'
    
    Returns:
        JSON array with cashier information:
        - Cashier ID, name, counter number
        - Transaction count (current workload)
        - Array of assigned transactions with codes and amounts
    """
```

#### 3.4.6.4 Real-Time Update Mechanism

The monitor subscribes to multiple Socket.IO broadcast events:

- `monitor_updated`: General system state changes
- `monitor_customer_confirmed`: New customer confirmation
- `monitor_therapist_confirmed`: Therapist claims customer
- `monitor_service_started`: Service begins
- `monitor_service_finished`: Service completes
- `monitor_payment_counter`: Cashier claims transaction
- `monitor_payment_completed`: Payment processed

---

### 3.4.7 Authentication and Authorization Module

#### 3.4.7.1 Module Purpose

The Authentication and Authorization Module manages user identity verification, session management, and access control for therapist and cashier roles. This module implements token-based authentication with hybrid fallback to session-based authentication.

#### 3.4.7.2 Module Components

**1. Route Handler (`routes/auth.py`)**

| Endpoint | Method | Function | Description |
|----------|--------|----------|-------------|
| `/login/therapist` | GET | `login_therapist_form()` | Therapist login page |
| `/login/therapist` | POST | `login_therapist()` | Process therapist login |
| `/login/cashier` | GET | `login_cashier_form()` | Cashier login page |
| `/login/cashier` | POST | `login_cashier()` | Process cashier login |
| `/logout/therapist` | POST | `logout_therapist()` | Therapist logout |
| `/logout/cashier` | POST | `logout_cashier()` | Cashier logout |

**2. Authentication Utilities (`utils/auth_helpers.py`)**

- `get_current_therapist()`: Retrieves authenticated therapist from token or session
- `get_current_cashier()`: Retrieves authenticated cashier from token or session

#### 3.4.7.3 Core Functions

**Function 1: Credential Validation**

```python
def login_therapist():
    """
    Authenticates therapist credentials and establishes session.
    
    Workflow:
        1. Receives username and password from POST request
        2. Queries Therapist table for matching username
        3. Verifies password using check_password() method
        4. Generates authentication token
        5. Stores token in database with expiration timestamp
        6. Returns token to client for SessionStorage
        7. Redirects to therapist dashboard
    
    Security Measures:
        - Password verification via bcrypt hashing
        - Token generation with cryptographic randomness
        - Token expiration mechanism
        - Failed login attempt handling
    """
```

**Function 2: Hybrid Authentication**

```python
def get_current_therapist():
    """
    Retrieves authenticated therapist using hybrid authentication.
    
    Authentication Priority:
        1. Token-based: Checks Authorization header or query parameter
        2. Session-based: Falls back to Flask session
    
    Token Validation:
        - Verifies token exists in database
        - Checks token expiration timestamp
        - Ensures therapist account is active
    
    Returns:
        Tuple (therapist_object, auth_method) or (None, None)
    """
```

**Function 3: Password Security**

Implemented in `models.py` for Therapist and Cashier models:

```python
def set_password(self, password: str) -> None:
    """
    Hashes password using Werkzeug security utilities.
    
    Algorithm: Bcrypt-compatible with automatic salt generation
    """
    self.password_hash = generate_password_hash(password)

def check_password(self, password: str) -> bool:
    """
    Verifies password against stored hash.
    
    Returns: Boolean indicating password validity
    """
    return check_password_hash(self.password_hash, password)
```

---

### 3.4.8 Supporting Modules and Utilities

#### 3.4.8.1 Database Models Module (`models.py`)

Defines 10 SQLAlchemy ORM models representing system entities:

**Core Models:**

1. **ServiceCategory**: Service categorization (e.g., Massage, Facial, Body Treatment)
2. **Service**: Individual service definitions (e.g., Swedish Massage, Hot Stone Therapy)
3. **ServiceClassification**: Pricing tiers (e.g., 60min/₱500, 90min/₱700, 120min/₱900)
4. **Therapist**: Therapist accounts with authentication credentials
5. **Cashier**: Cashier accounts with authentication credentials
6. **Transaction**: Customer transaction records with lifecycle tracking
7. **TransactionItem**: Line items linking services to transactions
8. **Payment**: Payment records with financial details
9. **Room**: Treatment room management
10. **TransactionCounter**: Sequential transaction code generator

**Key Model Methods:**

- `Transaction.generate_code()`: Generates unique 4-digit sequential codes
- `Transaction.recompute_totals()`: Recalculates total amount and duration from items
- `Therapist.set_password()` / `Cashier.set_password()`: Password hashing
- `Therapist.check_password()` / `Cashier.check_password()`: Password verification

#### 3.4.8.2 Real-Time Event Module (`socketio_events.py`)

Centralizes all Socket.IO event handlers for bidirectional communication:

**Event Categories:**

1. **Connection Management**: `connect`, `join_room`
2. **Customer Events**: `customer_confirm_selection`
3. **Therapist Events**: `therapist_subscribe`, `therapist_confirm_next`, `therapist_start_service`, `therapist_add_service`, `therapist_remove_item`, `therapist_finish_service`, `therapist_get_current_transaction`
4. **Cashier Events**: `cashier_subscribe`, `cashier_claim_next`, `cashier_pay`, `cashier_get_current_transaction`
5. **Monitor Events**: `monitor_subscribe`

**Utility Functions:**

- `serialize_transaction(tx)`: Converts Transaction object to JSON-serializable dictionary
- `_iso(dt)`: Formats datetime objects to ISO 8601 strings

#### 3.4.8.3 Application Factory (`__init__.py`)

Implements the application factory pattern for Flask initialization:

**Responsibilities:**

1. **Configuration Loading**: Reads environment variables for database connection and secret keys
2. **Database Initialization**: Configures SQLAlchemy with MySQL connection string
3. **Socket.IO Setup**: Initializes Flask-SocketIO with Eventlet async mode
4. **Blueprint Registration**: Registers all module blueprints
5. **Database Schema Creation**: Executes `db.create_all()` for table generation
6. **Event Handler Import**: Loads Socket.IO event handlers

---

### 3.4.9 Module Integration and Communication

#### 3.4.9.1 Inter-Module Communication Patterns

**1. HTTP Request-Response**
- Customer module renders pages via Flask route handlers
- Authentication module validates credentials via POST requests
- Monitor module fetches data snapshots via RESTful APIs

**2. Socket.IO Event Broadcasting**
- Customer confirmation triggers broadcast to therapist queue
- Therapist actions broadcast to monitor and customer rooms
- Cashier actions broadcast to monitor and cashier queue

**3. Database-Mediated Communication**
- All modules read/write to shared MySQL database
- Transaction status changes propagate through database updates
- Real-time queries ensure data consistency

#### 3.4.9.2 Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Factory                       │
│                      (__init__.py)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Customer   │  │  Therapist  │  │   Cashier   │
│   Module    │  │   Module    │  │   Module    │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Socket.IO      │
              │  Event Module   │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
┌─────────────┐  ┌──────────┐  ┌──────────┐
│   Monitor   │  │   Auth   │  │  Models  │
│   Module    │  │  Module  │  │  Module  │
└─────────────┘  └──────────┘  └────┬─────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │   Database   │
                              └──────────────┘
```

---

### 3.4.10 Module Function Summary Table

| Module | Primary Functions | Key Technologies | Data Dependencies |
|--------|------------------|------------------|-------------------|
| **Customer Service Selection** | Service browsing, cart management, transaction initiation | JavaScript, LocalStorage, Socket.IO | Service, ServiceCategory, ServiceClassification |
| **Therapist Service Management** | Queue claiming, service delivery, timer management, service modification | Socket.IO, Flask routes, row-level locking | Transaction, TransactionItem, Therapist, Room |
| **Cashier Payment Processing** | Transaction claiming, payment validation, change calculation, receipt generation | Socket.IO, Flask routes, row-level locking | Transaction, Payment, Cashier |
| **Real-Time Monitoring** | System-wide visualization, queue monitoring, room status tracking | Socket.IO broadcasting, RESTful APIs | All transaction-related tables |
| **Authentication & Authorization** | Credential validation, token management, session handling, access control | Werkzeug security, Flask sessions, token-based auth | Therapist, Cashier |
| **Database Models** | ORM mapping, data validation, relationship management, business logic | SQLAlchemy, MySQL | All database tables |
| **Socket.IO Events** | Real-time communication, event broadcasting, room management | Flask-SocketIO, Eventlet | All modules |
| **Application Factory** | Application initialization, configuration, blueprint registration | Flask, environment variables | All modules |

---

### 3.4.11 Summary

The SPA Management System implements a modular architecture comprising five primary functional modules and three supporting modules, each addressing specific operational requirements within the spa service delivery workflow. The modular design adheres to software engineering principles of separation of concerns, loose coupling, and high cohesion, enabling independent development and maintenance while preserving system-wide integration.

**Key Architectural Characteristics:**

1. **Role-Based Modularization**: Each user role (customer, therapist, cashier) has a dedicated module with tailored functionality and user interface.

2. **Real-Time Synchronization**: Socket.IO event module enables bidirectional communication across all modules, ensuring consistent state representation.

3. **Concurrency Safety**: Row-level database locking in therapist and cashier modules prevents race conditions in queue claiming operations.

4. **Centralized Monitoring**: Monitor module aggregates data from all operational modules, providing comprehensive system visibility.

5. **Security Integration**: Authentication module provides unified access control across all protected modules.

The modular architecture demonstrates scalability, maintainability, and extensibility, providing a robust foundation for current operational requirements and future system enhancements.
