# CHAPTER 3: METHODOLOGY - SYSTEM ARCHITECTURE DIAGRAMS (MERMAID)

Complete set of Mermaid diagrams with detailed descriptions for your thesis Chapter 3 System Architecture section.

---

## 1. Three-Tier System Architecture

```mermaid
graph TB
    subgraph CLIENT["CLIENT TIER - Presentation Layer"]
        A1[Customer Interface<br/>services1.html, services2.html]
        A2[Therapist Interface<br/>therapist.html, service_management.html]
        A3[Cashier Interface<br/>cashier.html, payment_management.html]
        A4[Monitor Dashboard<br/>monitor.html]
    end
    
    subgraph APP["APPLICATION TIER - Business Logic Layer"]
        B1[Flask Application Server WSGI]
        B2[Flask-SocketIO Eventlet Async]
        
        subgraph BP["Route Blueprints MVC"]
            C1[customer_bp]
            C2[therapist_bp]
            C3[cashier_bp]
            C4[monitor_bp]
            C5[auth_bp]
        end
        
        BL[Business Logic Layer<br/>Transaction, Queue, Payment Mgmt]
        ORM[SQLAlchemy ORM]
    end
    
    subgraph DATA["DATA TIER - Persistence Layer"]
        DB[(MySQL InnoDB)]
        T1[Service Tables]
        T2[Transaction Tables]
        T3[User Tables]
        T4[Payment & Room Tables]
    end
    
    A1 & A2 & A3 & A4 -.->|HTTP/WebSocket| B1
    B1 --> B2
    B1 --> BP
    BP --> BL
    B2 --> BL
    BL --> ORM
    ORM --> DB
    DB --> T1 & T2 & T3 & T4
```

### Description:

The system implements a **three-tier architecture** separating presentation (4 role-specific interfaces), business logic (Flask with blueprints, Socket.IO for real-time communication, SQLAlchemy ORM), and data persistence (MySQL with 10 normalized tables). This architecture enables independent development, testing, and scaling of each tier while maintaining clear separation of concerns.

---

## 2. Transaction Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Selecting
    Selecting --> PendingTherapist: customer_confirm_selection
    PendingTherapist --> TherapistConfirmed: therapist_confirm_next<br/>(Row-level lock)
    TherapistConfirmed --> InService: therapist_start_service
    InService --> InService: add/remove services
    InService --> Finished: therapist_finish_service
    Finished --> AwaitingPayment: cashier_claim_next<br/>(Row-level lock)
    AwaitingPayment --> Paying: enter payment
    Paying --> Paid: cashier_pay
    Paid --> [*]
    
    note right of Selecting
        Cart in LocalStorage
        No DB record
    end note
    
    note right of PendingTherapist
        Transaction created
        Code: 0001-9999
        Broadcast to therapist_queue
        Timestamp: selection_confirmed_at
    end note
    
    note right of TherapistConfirmed
        Therapist assigned
        Room assigned
        Timestamp: therapist_confirmed_at
    end note
    
    note right of InService
        Service active
        Items modifiable
        Timestamp: service_start_at
    end note
    
    note right of Finished
        Service complete
        Broadcast to cashier_queue
        Timestamp: service_finish_at
    end note
    
    note right of Paid
        Payment recorded
        Change calculated
        Room released
        Timestamp: paid_at
    end note
```

### Description:

The transaction follows an **8-state finite state machine** enforced by `TransactionStatus` enum. Each transition is triggered by Socket.IO events and records timestamps for audit trail. Concurrency control uses `SELECT ... FOR UPDATE SKIP LOCKED` at therapist and cashier claiming stages to prevent race conditions. Services can be dynamically added/removed during the InService state, with automatic total recalculation.

---

## 3. Real-Time Communication Flow

```mermaid
sequenceDiagram
    participant C as Customer
    participant T as Therapist
    participant Ca as Cashier
    participant S as SocketIO Server
    participant DB as Database
    
    Note over C,DB: Phase 1: Service Selection
    C->>S: customer_confirm_selection(cart)
    S->>DB: INSERT Transaction, TransactionItems
    S->>DB: Generate code (TransactionCounter)
    S->>T: broadcast(therapist_queue_updated)
    S->>C: emit(customer_selection_received)
    
    Note over C,DB: Phase 2: Service Delivery
    T->>S: therapist_confirm_next(token)
    S->>DB: SELECT FOR UPDATE SKIP LOCKED
    Note right of DB: Row-level lock acquired
    S->>DB: UPDATE therapist_id, room_number
    S->>T: broadcast(therapist_queue_updated)
    
    T->>S: therapist_start_service(txn_id)
    S->>DB: UPDATE status=in_service
    
    T->>S: therapist_add_service(service_id)
    S->>DB: INSERT TransactionItem
    S->>DB: Recalculate totals
    
    T->>S: therapist_finish_service(txn_id)
    S->>DB: UPDATE status=finished
    S->>Ca: broadcast(cashier_queue_updated)
    
    Note over C,DB: Phase 3: Payment
    Ca->>S: cashier_claim_next(token)
    S->>DB: SELECT FOR UPDATE SKIP LOCKED
    S->>DB: UPDATE cashier_id
    
    Ca->>S: cashier_pay(amount)
    S->>S: Calculate change
    S->>DB: INSERT Payment
    S->>DB: UPDATE status=paid
```

### Description:

Real-time communication uses **WebSocket protocol** via Flask-SocketIO with room-based broadcasting. The system implements **publish-subscribe pattern** with rooms: `therapist_queue` (all therapists), `cashier_queue` (all cashiers), `monitor` (dashboard). Concurrency control prevents double-assignment through pessimistic locking with `SKIP LOCKED` clause. All state changes broadcast to relevant subscribers for sub-second synchronization.

---

## 4. Database Entity-Relationship Diagram

```mermaid
erDiagram
    ServiceCategory ||--o{ Service : contains
    Service ||--o{ ServiceClassification : "has tiers"
    Service ||--o{ TransactionItem : "included in"
    ServiceClassification ||--o{ TransactionItem : "pricing"
    
    Therapist ||--o{ Transaction : serves
    Cashier ||--o{ Transaction : "processes"
    Cashier ||--o{ Payment : records
    
    Transaction ||--|{ TransactionItem : contains
    Transaction ||--o| Payment : "paid via"
    Transaction ||--o| Room : "uses"
    
    ServiceCategory {
        int id PK
        string category_name UK
    }
    
    Service {
        int id PK
        int category_id FK
        string service_name
        string description
    }
    
    ServiceClassification {
        int id PK
        int service_id FK
        string classification_name
        decimal price
        int duration_minutes
    }
    
    Therapist {
        int id PK
        string username UK
        string password_hash
        string name
        string room_number
        boolean active
        string auth_token UK
        datetime token_expires_at
    }
    
    Cashier {
        int id PK
        string username UK
        string password_hash
        string name
        string counter_number
        boolean active
        string auth_token UK
        datetime token_expires_at
    }
    
    Transaction {
        int id PK
        string code UK
        enum status
        int therapist_id FK
        int assigned_cashier_id FK
        string room_number
        decimal total_amount
        int total_duration_minutes
        datetime created_at
        datetime selection_confirmed_at
        datetime therapist_confirmed_at
        datetime service_start_at
        datetime service_finish_at
        datetime cashier_claimed_at
        datetime paid_at
    }
    
    TransactionItem {
        int id PK
        int transaction_id FK
        int service_id FK
        int service_classification_id FK
        decimal price
        int duration_minutes
    }
    
    Payment {
        int id PK
        int transaction_id FK_UK
        int cashier_id FK
        decimal amount_due
        decimal amount_paid
        decimal change_amount
        string method
        datetime created_at
    }
    
    Room {
        int id PK
        string room_number UK
        string status
        int current_transaction_id FK
    }
```

### Description:

The database follows **Third Normal Form (3NF)** with 10 entities. **Service hierarchy** (Category→Service→Classification) enables flexible pricing tiers. **Transaction** entity is the central hub with 7 timestamps providing complete audit trail. **Denormalized fields** in TransactionItem (price, duration) preserve historical accuracy. **Soft delete** pattern on user tables maintains referential integrity. **Foreign key constraints** enforce data integrity. **TransactionCounter** singleton generates unique 4-digit codes.

---

## 5. Concurrency Control Mechanism

```mermaid
sequenceDiagram
    participant T1 as Therapist 1
    participant T2 as Therapist 2
    participant S as Server
    participant DB as MySQL
    
    Note over T1,DB: Both click "Confirm Next" simultaneously
    
    par Concurrent Requests
        T1->>S: therapist_confirm_next
        T2->>S: therapist_confirm_next
    end
    
    S->>DB: BEGIN TRANSACTION (T1)
    S->>DB: BEGIN TRANSACTION (T2)
    
    S->>DB: SELECT FOR UPDATE SKIP LOCKED (T1)
    Note right of DB: T1 locks Transaction #0001
    DB-->>S: Transaction #0001 (locked)
    
    S->>DB: SELECT FOR UPDATE SKIP LOCKED (T2)
    Note right of DB: #0001 locked, skip to #0002
    DB-->>S: Transaction #0002 (locked)
    
    S->>DB: UPDATE #0001 SET therapist_id=T1
    S->>DB: UPDATE #0002 SET therapist_id=T2
    
    S->>DB: COMMIT (T1)
    S->>DB: COMMIT (T2)
    
    S-->>T1: Assigned #0001
    S-->>T2: Assigned #0002
    
    Note over T1,DB: No race condition - different transactions
```

### Description:

**Pessimistic locking** prevents race conditions using MySQL's `SELECT ... FOR UPDATE SKIP LOCKED`. When multiple users claim transactions simultaneously, each acquires row-level lock on different transactions. The `SKIP LOCKED` clause instructs database to skip locked rows, automatically moving to next available transaction. This eliminates deadlocks while ensuring exactly-once assignment. Same mechanism applies to cashier queue claiming.

---

## 6. WebSocket Room Architecture

```mermaid
graph TB
    subgraph Clients
        C1[Customer 1]
        C2[Customer 2]
        T1[Therapist 1]
        T2[Therapist 2]
        Ca1[Cashier 1]
        Ca2[Cashier 2]
        M[Monitor]
    end
    
    subgraph SocketIO["Flask-SocketIO Server"]
        subgraph Rooms
            R1[therapist_queue<br/>All therapists subscribe]
            R2[cashier_queue<br/>All cashiers subscribe]
            R3[monitor<br/>Dashboard subscribes]
            R4[txn_123<br/>Per-transaction room]
            R5[txn_124<br/>Per-transaction room]
        end
    end
    
    C1 -.->|join| R4
    C2 -.->|join| R5
    T1 & T2 -.->|subscribe| R1
    Ca1 & Ca2 -.->|subscribe| R2
    M -.->|subscribe| R3
    
    R1 -.->|queue updates| T1 & T2
    R2 -.->|payment queue| Ca1 & Ca2
    R3 -.->|all events| M
    R4 -.->|txn updates| C1
    R5 -.->|txn updates| C2
```

### Description:

**Room-based broadcasting** implements publish-subscribe pattern for targeted message delivery. **Global rooms**: `therapist_queue` receives queue updates, `cashier_queue` receives payment queue updates, `monitor` receives all system events. **Per-transaction rooms**: `txn_{id}` for customer-specific updates. Clients subscribe to relevant rooms based on role. This architecture minimizes network traffic by broadcasting only to interested parties, enabling efficient real-time synchronization across hundreds of concurrent connections.

---

## 7. Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant U as User (Therapist/Cashier)
    participant B as Browser
    participant S as Server
    participant DB as Database
    
    U->>B: Enter username & password
    B->>S: POST /auth/login (credentials)
    S->>DB: SELECT * FROM therapists WHERE username=?
    DB-->>S: User record
    S->>S: check_password_hash(input, stored_hash)
    
    alt Password Valid
        S->>S: Generate auth_token (UUID)
        S->>S: Set token_expires_at (24 hours)
        S->>DB: UPDATE therapists SET auth_token, token_expires_at
        S-->>B: {token, name, room_number}
        B->>B: Store token in SessionStorage
        B-->>U: Redirect to dashboard
    else Password Invalid
        S-->>B: {error: "Invalid credentials"}
        B-->>U: Show error message
    end
    
    Note over U,DB: Subsequent Requests
    
    U->>B: Access protected page
    B->>B: Retrieve token from SessionStorage
    B->>S: GET /therapist (Authorization: Bearer token)
    S->>DB: SELECT * FROM therapists WHERE auth_token=?
    DB-->>S: User record
    
    alt Token Valid & Not Expired
        S->>S: Check token_expires_at > NOW()
        S-->>B: Render protected page
    else Token Invalid/Expired
        S-->>B: Redirect to login
    end
```

### Description:

**Token-based authentication** secures therapist and cashier interfaces. Passwords are hashed using Werkzeug's bcrypt-compatible algorithm. Upon successful login, server generates unique auth token (UUID) with 24-hour expiration, stored in database and browser SessionStorage. Protected routes validate token on each request by querying database and checking expiration. **Hybrid authentication** supports both token (primary) and session (fallback) for flexibility. Tokens are unique per user (database constraint) preventing token reuse.

---

## 8. Deployment Architecture

```mermaid
graph TB
    subgraph DEV["Development Environment"]
        B1[Browser Multiple Tabs]
        F1[Flask App Port 5000<br/>Virtual Environment]
        X1[XAMPP MySQL Port 3306]
        P1[phpMyAdmin]
        
        B1 <-->|localhost:5000| F1
        F1 <-->|localhost:3306| X1
        P1 <-->|manage| X1
    end
    
    subgraph PROD["Production Environment Recommended"]
        C[Client Devices]
        N[Nginx Reverse Proxy<br/>SSL Termination]
        
        subgraph AppServers["Application Servers"]
            AS1[Flask + Gunicorn + Eventlet]
            AS2[Flask + Gunicorn + Eventlet]
        end
        
        R[Redis<br/>Socket.IO Adapter]
        
        subgraph DBCluster["Database Cluster"]
            DBP[(MySQL Primary<br/>Read/Write)]
            DBR[(MySQL Replica<br/>Read Only)]
        end
        
        C <-->|HTTPS| N
        N --> AS1 & AS2
        AS1 & AS2 <--> R
        AS1 & AS2 --> DBP
        AS1 & AS2 --> DBR
        DBP -.->|replication| DBR
    end
```

### Description:

**Development**: Local setup with Flask on port 5000, XAMPP MySQL, phpMyAdmin for database management. Multiple browser tabs simulate concurrent users. **Production**: Nginx handles SSL/TLS and load balancing. Multiple Flask servers with Gunicorn+Eventlet workers for horizontal scaling. Redis serves as Socket.IO adapter enabling message broadcasting across server instances. MySQL primary-replica configuration: primary handles writes, replicas distribute reads. This architecture supports thousands of concurrent users with high availability.

---

## References

- Bernstein, P. A., & Newcomer, E. (2009). *Principles of Transaction Processing*. Morgan Kaufmann.
- Codd, E. F. (1970). A relational model of data for large shared data banks. *Communications of the ACM*, 13(6), 377-387.
- Eugster, P. T., et al. (2003). The many faces of publish/subscribe. *ACM Computing Surveys*, 35(2), 114-131.
- Fette, I., & Melnikov, A. (2011). *The WebSocket Protocol* (RFC 6455). IETF.
- Fowler, M. (2002). *Patterns of Enterprise Application Architecture*. Addison-Wesley.
- Sommerville, I. (2016). *Software Engineering* (10th ed.). Pearson.

---

## Usage Instructions

These Mermaid diagrams render automatically in GitHub, GitLab, and many Markdown viewers. For your thesis:
1. Export diagrams as PNG/SVG using Mermaid Live Editor (https://mermaid.live)
2. Insert images into your Word/LaTeX document
3. Use the detailed descriptions as figure captions and explanatory text
4. Cross-reference with your existing `CHAPTER_3_SYSTEM_ARCHITECTURE.md` for comprehensive coverage
