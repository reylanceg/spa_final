# 3.2.3 Main System Parts and How They Work Together

## Overview

The SPA Management System is made up of seven main parts that work together to provide complete spa management functionality. Each part has a specific purpose and connects with other parts to ensure smooth operations.

---

## The Seven System Parts

### Part 1: User Interface Layer
**What It Does**: Provides different screens for each type of user  

**Main Jobs**: 
- Shows information clearly
- Captures what users type or click
- Remembers user preferences  

**Connections**: 
- Sends user requests to the processing layer
- Receives real-time updates
- Displays current system status

---

### Part 2: Processing Layer
**What It Does**: Handles all business rules and processes user requests  

**Main Jobs**: 
- Checks that requests are valid
- Applies business rules
- Generates responses  

**Connections**: 
- Receives requests from user interfaces
- Retrieves data from the database
- Sends real-time updates
- Verifies user permissions

---

### Part 3: Database Layer
**What It Does**: Stores all information permanently and keeps it accurate  

**Main Jobs**: 
- Saves and retrieves data
- Enforces data rules
- Processes searches  

**Connections**: 
- Receives data requests from the processing layer
- Returns requested information
- Ensures data relationships are maintained
- Prevents conflicts when multiple users access the same data

---

### Part 4: Real-Time Communication System
**What It Does**: Keeps all users updated instantly when things change  

**Main Jobs**: 
- Maintains connections to users
- Sends updates to relevant users
- Keeps everyone synchronized  

**Connections**: 
- Links the processing layer with user interfaces
- Maintains always-on connections
- Ensures updates reach the right users

---

### Part 5: Security System
**What It Does**: Controls who can access the system and what they can do  

**Main Jobs**: 
- Verifies user identities
- Creates secure sessions
- Enforces role-based permissions  

**Connections**: 
- Checks login credentials
- Creates security tokens
- Ensures users only access appropriate features

---

### Part 6: Queue Management System
**What It Does**: Manages the customer queue and service assignments  

**Main Jobs**: 
- Maintains queue order
- Prevents conflicts when multiple therapists claim customers
- Tracks service states  

**Connections**: 
- Retrieves and updates database information
- Broadcasts queue changes
- Ensures only one therapist can claim each customer

---

### Part 7: Payment System
**What It Does**: Handles all payment transactions and financial records  

**Main Jobs**: 
- Validates payment amounts
- Records payment information
- Finalizes transactions  

**Connections**: 
- Retrieves transaction details
- Creates payment records
- Verifies amounts match services
- Broadcasts payment confirmations

---

## How the Parts Connect

The following diagram shows how all seven parts work together:

```
┌─────────────────────────────────────────────────────────┐
│              USER INTERFACE LAYER                        │
│  Customer Screen │ Therapist Screen │ Cashier Screen    │
│  Monitor Dashboard                                       │
└────────┬─────────────┬────────────┬───────────┬─────────┘
         │             │            │           │
         │    User Actions & Real-Time Updates  │
         │             │            │           │
┌────────▼─────────────▼────────────▼───────────▼─────────┐
│              PROCESSING LAYER                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │   Real-Time Communication System                  │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Security │  │  Queue   │  │ Payment  │             │
│  │  System  │  │  System  │  │  System  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌───────────────────────────────────────────────────┐  │
│  │   Business Rules & Request Processing            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │ Data Storage & Retrieval
┌─────────────────────────▼───────────────────────────────┐
│                   DATABASE LAYER                         │
│  Services │ Transactions │ Users │ Payments │ Logs      │
└──────────────────────────────────────────────────────────┘
```

**Figure 3.X**: How System Parts Connect and Work Together

---

## Key Relationships Between Parts

### 1. User Interface ↔ Processing Layer
- **Direction**: Two-way communication
- **Purpose**: User interfaces send requests and receive responses
- **Mechanism**: HTTP requests for actions, WebSocket for real-time updates

### 2. Processing Layer ↔ Database Layer
- **Direction**: Two-way communication
- **Purpose**: Processing layer stores and retrieves data
- **Mechanism**: Database queries and transactions

### 3. Real-Time Communication System ↔ All Users
- **Direction**: Broadcast from system to users
- **Purpose**: Instantly notify users of changes
- **Mechanism**: WebSocket connections with room-based routing

### 4. Security System → All Parts
- **Direction**: One-way verification
- **Purpose**: Ensures only authorized actions are performed
- **Mechanism**: Token validation before processing requests

### 5. Queue Management ↔ Database
- **Direction**: Two-way with locking
- **Purpose**: Manage queue state with conflict prevention
- **Mechanism**: Database transactions with row-level locking

### 6. Payment System ↔ Database
- **Direction**: Two-way transactional
- **Purpose**: Record payments and link to transactions
- **Mechanism**: ACID-compliant database transactions

---

## Summary

The seven system parts work together as a cohesive unit:

1. **User Interface Layer** provides the screens users interact with
2. **Processing Layer** acts as the coordinator and enforces business rules
3. **Database Layer** stores all information permanently
4. **Real-Time Communication System** keeps everyone updated instantly
5. **Security System** controls access and permissions
6. **Queue Management System** handles customer flow
7. **Payment System** processes financial transactions

Each part has clear responsibilities and well-defined connections with other parts, ensuring the system operates smoothly and reliably even when multiple users are working simultaneously.
