# CHAPTER 3: METHODOLOGY - SIMPLIFIED SYSTEM ARCHITECTURE DIAGRAMS

Simplified Mermaid diagrams for easier understanding - perfect for thesis presentations.

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Users"
        U1[Customer]
        U2[Therapist]
        U3[Cashier]
        U4[Monitor]
    end
    
    subgraph "Web Application"
        WEB[Flask Web Server<br/>+ Socket.IO]
    end
    
    subgraph "Database"
        DB[(MySQL<br/>Database)]
    end
    
    U1 & U2 & U3 & U4 <-->|Browser| WEB
    WEB <-->|Store/Retrieve Data| DB
    
    style U1 fill:#e3f2fd
    style U2 fill:#fff3e0
    style U3 fill:#f3e5f5
    style U4 fill:#e8f5e9
    style WEB fill:#fff9c4
    style DB fill:#c8e6c9
```

### Description:

The system has **three main parts**: Users access the system through web browsers, a Flask web server handles all requests and real-time updates via Socket.IO, and a MySQL database stores all information. This simple architecture allows multiple users to interact with the system simultaneously.

---

## 2. Transaction Flow (Customer Journey)

```mermaid
graph LR
    A[Customer<br/>Selects Services] --> B[Therapist<br/>Provides Service]
    B --> C[Cashier<br/>Processes Payment]
    C --> D[Transaction<br/>Complete]
    
    style A fill:#e3f2fd
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#c8e6c9
```

### Description:

A customer's journey has **three simple steps**: First, the customer selects services. Second, a therapist provides the service. Third, a cashier processes the payment. Each step updates the system in real-time so everyone sees the current status.

---

## 3. Transaction States

```mermaid
stateDiagram-v2
    [*] --> Selecting: Customer browses
    Selecting --> Waiting: Customer confirms
    Waiting --> InProgress: Therapist starts
    InProgress --> Done: Therapist finishes
    Done --> Paid: Cashier processes
    Paid --> [*]
```

### Description:

Every transaction goes through **5 main states**: Selecting (customer choosing services), Waiting (waiting for therapist), InProgress (service being provided), Done (service finished), and Paid (payment completed). The system tracks which state each transaction is in.

---

## 4. Real-Time Updates

```mermaid
sequenceDiagram
    participant Customer
    participant Server
    participant Therapist
    participant Cashier
    
    Customer->>Server: Confirm services
    Server->>Therapist: New customer waiting!
    
    Therapist->>Server: Start service
    Server->>Therapist: Service started
    
    Therapist->>Server: Finish service
    Server->>Cashier: Customer ready for payment!
    
    Cashier->>Server: Payment complete
    Server->>Cashier: Payment recorded
```

### Description:

The system uses **real-time communication** so everyone sees updates instantly. When a customer confirms services, therapists immediately see a new customer. When a therapist finishes, cashiers immediately see a customer ready for payment. No page refresh needed!

---

## 5. Database Tables (Simplified)

```mermaid
erDiagram
    SERVICE ||--o{ TRANSACTION_ITEM : contains
    THERAPIST ||--o{ TRANSACTION : serves
    CASHIER ||--o{ TRANSACTION : processes
    TRANSACTION ||--|{ TRANSACTION_ITEM : has
    TRANSACTION ||--o| PAYMENT : receives
    
    SERVICE {
        int id
        string name
        decimal price
    }
    
    THERAPIST {
        int id
        string username
        string name
    }
    
    CASHIER {
        int id
        string username
        string name
    }
    
    TRANSACTION {
        int id
        string code
        string status
        decimal total
    }
    
    TRANSACTION_ITEM {
        int id
        int transaction_id
        int service_id
    }
    
    PAYMENT {
        int id
        decimal amount_paid
        decimal change
    }
```

### Description:

The database has **6 main tables**: Services (available services), Therapists (staff providing services), Cashiers (staff processing payments), Transactions (customer orders), Transaction Items (services in each order), and Payments (payment records). Tables are connected through relationships.

---

## 6. How Multiple Users Work Together

```mermaid
graph TB
    subgraph "Therapist Queue"
        T1[Therapist 1]
        T2[Therapist 2]
    end
    
    subgraph "Waiting Customers"
        C1[Customer A]
        C2[Customer B]
        C3[Customer C]
    end
    
    subgraph "Cashier Queue"
        CA1[Cashier 1]
        CA2[Cashier 2]
    end
    
    C1 & C2 & C3 -.->|Waiting for| T1 & T2
    T1 & T2 -.->|Finished customers| CA1 & CA2
    
    style C1 fill:#e3f2fd
    style C2 fill:#e3f2fd
    style C3 fill:#e3f2fd
    style T1 fill:#fff3e0
    style T2 fill:#fff3e0
    style CA1 fill:#f3e5f5
    style CA2 fill:#f3e5f5
```

### Description:

The system manages **queues** automatically. Multiple customers can wait for available therapists. When therapists finish services, customers move to the cashier queue. The system prevents two therapists from claiming the same customer using database locking.

---

## 7. User Authentication

```mermaid
graph LR
    A[User enters<br/>username & password] --> B{Valid?}
    B -->|Yes| C[Generate token]
    B -->|No| D[Show error]
    C --> E[User accesses<br/>their dashboard]
    D --> A
    
    style A fill:#e3f2fd
    style B fill:#fff9c4
    style C fill:#c8e6c9
    style D fill:#ffcdd2
    style E fill:#c8e6c9
```

### Description:

**Security** is simple: Therapists and cashiers log in with username and password. Passwords are encrypted (hashed) in the database. After successful login, the system creates a secure token that expires after 24 hours. Users must log in again after the token expires.

---

## 8. System Deployment

```mermaid
graph TB
    subgraph "User Devices"
        D1[Computers]
        D2[Tablets]
        D3[Phones]
    end
    
    subgraph "Server"
        S[Flask Application<br/>Running on Server]
    end
    
    subgraph "Database"
        DB[(MySQL<br/>Database)]
    end
    
    D1 & D2 & D3 <-->|Internet| S
    S <-->|Data| DB
    
    style D1 fill:#e3f2fd
    style D2 fill:#e3f2fd
    style D3 fill:#e3f2fd
    style S fill:#fff9c4
    style DB fill:#c8e6c9
```

### Description:

The system can be accessed from **any device** with a web browser (computers, tablets, phones). All devices connect to a central Flask server through the internet. The server communicates with the MySQL database to store and retrieve information. This setup allows staff to work from different locations in the spa.

---

## Key System Features Summary

### 1. **Real-Time Updates**
- No page refresh needed
- Everyone sees changes instantly
- Uses WebSocket technology (Socket.IO)

### 2. **Queue Management**
- Automatic customer queuing
- Prevents double-booking
- Fair first-come-first-served system

### 3. **Role-Based Access**
- Customers: Browse and select services
- Therapists: View queue, provide services
- Cashiers: Process payments
- Monitor: View all activities

### 4. **Data Integrity**
- All transactions recorded in database
- Complete history with timestamps
- Secure password storage

### 5. **Concurrent Operations**
- Multiple users can work simultaneously
- Database locking prevents conflicts
- Scalable to many users

---

## Technology Stack (Simple Version)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | HTML, CSS, JavaScript | User interface |
| **Backend** | Python Flask | Web server |
| **Real-time** | Socket.IO | Live updates |
| **Database** | MySQL | Data storage |
| **Security** | Password hashing, Tokens | User authentication |

---

## How It All Works Together

1. **Customer** opens website and selects services → Stored in database
2. **System** broadcasts update → Therapists see new customer in queue
3. **Therapist** claims customer → Database locks transaction to prevent duplicates
4. **Therapist** provides service → Can add/remove services during treatment
5. **Therapist** finishes → System broadcasts to cashiers
6. **Cashier** claims transaction → Database locks to prevent duplicates
7. **Cashier** processes payment → Calculates change automatically
8. **System** marks transaction complete → Room becomes available
9. **Monitor** dashboard shows all activities in real-time

---

## Benefits of This Architecture

✅ **Simple to Use** - Intuitive interface for all users  
✅ **Fast** - Real-time updates without delays  
✅ **Reliable** - Database ensures no data loss  
✅ **Secure** - Encrypted passwords and token authentication  
✅ **Scalable** - Can handle many concurrent users  
✅ **Maintainable** - Clear separation of concerns  

---

## References

- Sommerville, I. (2016). *Software Engineering* (10th ed.). Pearson.
- Fowler, M. (2002). *Patterns of Enterprise Application Architecture*. Addison-Wesley.
