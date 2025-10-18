# System Architecture Overview - Academic Version

## 3.3 System Architecture

### 3.3.1 Overview

The SPA Management System employs a **three-tier client-server architecture** with real-time communication capabilities, designed to facilitate concurrent multi-role operations in a spa service environment. The architecture integrates a presentation layer (client tier), business logic layer (application tier), and data persistence layer (database tier), interconnected through a bidirectional event-driven communication framework utilizing WebSocket technology. This architectural design enables seamless coordination among four distinct user roles—customers, therapists, cashiers, and monitors—each interacting with the system simultaneously while maintaining consistent state across all interfaces.

The system architecture is built upon the **Model-View-Controller (MVC)** pattern enhanced with **WebSocket-based real-time communication**, enabling instantaneous state synchronization across all connected clients without requiring page refreshes or manual updates. This architectural approach addresses the critical requirement of maintaining consistent queue state and transaction status across customer, therapist, cashier, and monitor interfaces in a concurrent operational environment where multiple users interact with shared resources simultaneously. The integration of Socket.IO technology ensures that when one user performs an action—such as a customer confirming service selection or a therapist completing a service—all relevant interfaces immediately reflect the updated state, thereby eliminating information lag and preventing operational conflicts.

The architectural design prioritizes five key principles that guide all implementation decisions:

**1. Separation of Concerns**  
The system employs strict modular separation through Flask's blueprint architecture, organizing functionality by user role (customer, therapist, cashier, monitor, authentication) rather than technical layers. This modularization facilitates independent development, testing, and maintenance of each subsystem while ensuring clear boundaries between presentation logic, business rules, and data access operations. Each blueprint encapsulates its own route handlers, business logic, and template rendering, reducing coupling and enhancing code maintainability.

**2. Real-Time Responsiveness**  
The event-driven communication model ensures sub-second latency for state updates across all connected clients. Unlike traditional request-response architectures that require polling or manual refresh, the WebSocket-based approach enables the server to push updates to clients immediately upon state changes. This real-time capability is essential for queue management, where therapists and cashiers must see new customers instantly, and for monitoring dashboards that display live operational statistics.

**3. Data Integrity and Consistency**  
The system implements ACID-compliant transaction management through MySQL's InnoDB storage engine, ensuring that all database operations maintain atomicity, consistency, isolation, and durability. Foreign key constraints enforce referential integrity across related entities (transactions, services, payments), preventing orphaned records and maintaining data consistency. Additionally, the system employs pessimistic row-level locking with `SELECT ... FOR UPDATE SKIP LOCKED` to prevent race conditions when multiple therapists or cashiers attempt to claim the same customer simultaneously.

**4. Concurrency Safety**  
The architecture addresses the inherent challenges of concurrent multi-user operations through multiple mechanisms: (a) database-level pessimistic locking prevents double-booking of customers, (b) Eventlet's asynchronous I/O model enables non-blocking handling of multiple simultaneous WebSocket connections, and (c) atomic database transactions ensure that complex operations (such as creating a transaction with multiple service items) complete entirely or not at all, preventing partial state updates.

**5. Scalability and Extensibility**  
The modular blueprint architecture and stateless authentication design (token-based rather than server-side sessions) enable horizontal scaling capabilities. The system can accommodate additional user roles by creating new blueprints without modifying existing code, and the Socket.IO room-based broadcasting mechanism allows targeted message delivery to specific user groups, reducing unnecessary network traffic. The ORM abstraction layer (SQLAlchemy) provides database independence, allowing migration to alternative database systems (PostgreSQL, Oracle) without application code changes.

The system manages a complete transaction lifecycle spanning eight distinct states: `selecting` (customer browsing services), `pending_therapist` (awaiting therapist assignment), `therapist_confirmed` (therapist assigned), `in_service` (service being provided), `finished` (service complete), `awaiting_payment` (in cashier queue), `paying` (payment processing), and `paid` (transaction complete). Each state transition triggers specific Socket.IO events that update relevant interfaces, ensuring all users maintain a consistent view of system state. This state machine approach provides clear operational semantics and enables comprehensive audit trails through timestamp recording at each transition point.

The data model comprises ten interconnected entities organized into three logical domains: (1) **Service Domain** (ServiceCategory, Service, ServiceClassification) defining available spa services with hierarchical categorization and flexible pricing tiers, (2) **Transaction Domain** (Transaction, TransactionItem, TransactionCounter, Payment) managing customer orders from selection through payment completion, and (3) **User Domain** (Therapist, Cashier, Room) representing system actors and physical resources. This domain-driven design aligns database structure with business concepts, facilitating intuitive understanding and maintenance.

The architecture implements multiple security layers to protect sensitive data and prevent common web vulnerabilities. Password security employs Werkzeug's bcrypt-compatible hashing algorithm with automatic salt generation, ensuring that even database compromise does not expose user credentials. Token-based authentication with 24-hour expiration provides stateless session management suitable for distributed deployments. SQL injection prevention is achieved through SQLAlchemy's parameterized query mechanism, which automatically escapes user input. Cross-site scripting (XSS) attacks are mitigated through Jinja2's automatic HTML escaping, preventing malicious script injection in user-generated content.

Performance optimization strategies include: (a) **Asynchronous I/O** through Eventlet's greenlet-based concurrency model, enabling efficient handling of hundreds of simultaneous WebSocket connections without thread overhead, (b) **Database connection pooling** via SQLAlchemy, reusing connections rather than establishing new ones for each request, (c) **Client-side caching** using browser LocalStorage for shopping cart persistence and SessionStorage for authentication tokens, reducing server load, and (d) **Selective data loading** through SQLAlchemy's lazy relationship loading, fetching related entities only when accessed rather than eagerly loading entire object graphs.

The communication architecture distinguishes between two complementary protocols: (1) **HTTP request-response** for initial page loads, form submissions, and traditional CRUD operations, providing reliable, stateless communication suitable for non-time-critical operations, and (2) **WebSocket bidirectional streaming** for real-time event propagation, enabling server-initiated updates and maintaining persistent connections for immediate state synchronization. This hybrid approach leverages the strengths of both protocols—HTTP's simplicity and caching capabilities for static content, and WebSocket's low-latency bidirectional communication for dynamic updates.

The system's deployment model supports flexible hosting configurations ranging from single-server development environments (XAMPP on localhost) to production deployments on cloud platforms (AWS, Azure, Google Cloud). The stateless authentication design and database-backed state management enable horizontal scaling through load balancers distributing traffic across multiple application servers sharing a common database. For high-availability scenarios, Socket.IO supports Redis adapter integration for cross-server message broadcasting, allowing WebSocket connections distributed across multiple servers to receive synchronized updates.

This architectural foundation provides a robust, maintainable, and scalable platform for spa management operations, successfully addressing the complex requirements of concurrent multi-role interactions, real-time state synchronization, queue management, payment processing, and comprehensive audit trails. The design demonstrates industry-standard patterns and best practices while remaining pragmatic and appropriate for the application's scale and complexity.

---

## Alternative Overview Versions

### Version 2: Concise Academic Overview (Shorter)

The SPA Management System implements a **three-tier client-server architecture** enhanced with **real-time bidirectional communication** to support concurrent multi-role operations in a spa service environment. The architecture comprises a presentation layer (HTML/CSS/JavaScript), an application layer (Flask with Socket.IO), and a data persistence layer (MySQL with SQLAlchemy ORM), organized according to the **Model-View-Controller (MVC)** pattern with event-driven extensions.

This architectural approach addresses three critical requirements: (1) **real-time state synchronization** across customer, therapist, cashier, and monitor interfaces through WebSocket-based event broadcasting, (2) **concurrency safety** through pessimistic database locking mechanisms preventing race conditions in queue claiming operations, and (3) **data integrity** through ACID-compliant transaction management and referential integrity constraints. The system manages a complete transaction lifecycle spanning eight states from initial service selection through payment completion, with each state transition triggering targeted real-time updates to relevant user interfaces.

The modular blueprint architecture separates functionality by user role, facilitating independent development and testing while maintaining clear boundaries between concerns. Token-based authentication provides stateless session management suitable for horizontal scaling, while Eventlet's asynchronous I/O model enables efficient handling of hundreds of concurrent WebSocket connections. The data model comprises ten normalized entities organized into service, transaction, and user domains, supporting flexible service categorization, comprehensive audit trails, and room resource management.

---

### Version 3: Detailed Technical Overview (Longer)

The SPA Management System employs a **three-tier client-server architecture** with **real-time bidirectional communication capabilities**, specifically designed to address the complex operational requirements of concurrent multi-role spa service management. The architecture integrates three distinct layers—presentation, application, and data persistence—interconnected through both traditional HTTP request-response protocols and modern WebSocket-based event streaming, creating a hybrid communication model that leverages the strengths of both synchronous and asynchronous paradigms.

**Architectural Foundation and Design Patterns**

The system architecture is fundamentally structured around the **Model-View-Controller (MVC)** pattern, enhanced with **event-driven architecture** principles to support real-time state propagation. The presentation layer consists of role-specific HTML5/CSS3/JavaScript interfaces for customers (service selection), therapists (queue management and service delivery), cashiers (payment processing), and monitors (system-wide oversight). The application layer implements Flask 3.0.3 as the web framework, Flask-SocketIO 5.3.6 for real-time communication, and SQLAlchemy 2.0.31 as the object-relational mapping layer. The data persistence layer utilizes MySQL with InnoDB storage engine, providing ACID-compliant transaction support essential for financial operations.

The blueprint-based modular architecture organizes functionality by user role rather than technical layers, with separate blueprints for customer operations (`customer.py`), therapist workflows (`therapist.py`), cashier functions (`cashier.py`), monitoring dashboards (`monitor.py`, `monitor_snapshot.py`), and authentication services (`auth.py`). This role-based organization aligns code structure with business domains, facilitating team collaboration and enabling independent evolution of each subsystem without cross-contamination of concerns.

**Real-Time Communication Infrastructure**

The real-time communication layer represents a critical architectural component that distinguishes this system from traditional web applications. Socket.IO implements a room-based broadcasting mechanism where clients subscribe to specific channels: `therapist_queue` for therapist interfaces, `cashier_queue` for cashier interfaces, `monitor` for monitoring dashboards, and per-transaction rooms (`txn_{transaction_id}`) for customer-specific updates. This targeted broadcasting approach ensures that state changes propagate only to relevant interfaces, reducing network overhead and preventing information leakage between user roles.

The WebSocket protocol provides full-duplex communication channels over a single TCP connection, enabling the server to push updates to clients immediately upon state changes without polling overhead. The system implements automatic reconnection logic to handle temporary network disruptions, heartbeat mechanisms for connection health monitoring, and graceful degradation to long-polling for environments where WebSocket connections are blocked by firewalls or proxies.

**Concurrency Control and Data Integrity**

The architecture addresses the fundamental challenge of concurrent access to shared resources through multiple complementary mechanisms. At the database level, the system employs pessimistic row-level locking using MySQL's `SELECT ... FOR UPDATE` with `SKIP LOCKED` option. When a therapist attempts to claim the next customer from the queue, the database query locks the selected transaction row, preventing other therapists from claiming the same customer. The `SKIP LOCKED` option ensures that concurrent queries skip already-locked rows rather than blocking, preventing deadlocks and ensuring fair distribution of customers among available therapists.

Transaction management follows ACID principles rigorously: **Atomicity** ensures that complex operations (creating a transaction with multiple service items) complete entirely or not at all; **Consistency** is maintained through foreign key constraints and check constraints preventing invalid state transitions; **Isolation** is achieved through row-level locking and appropriate transaction isolation levels; **Durability** is guaranteed by MySQL's write-ahead logging and commit protocols, ensuring that completed transactions persist even in the event of system failure.

**State Management and Transaction Lifecycle**

The system implements a comprehensive state machine managing transaction progression through eight distinct states: `selecting`, `pending_therapist`, `therapist_confirmed`, `in_service`, `finished`, `awaiting_payment`, `paying`, and `paid`. Each state transition is governed by specific business rules and triggers corresponding Socket.IO events. For example, when a customer confirms service selection, the transaction transitions from `selecting` to `pending_therapist`, triggering a `customer_confirm_selection` event broadcast to the `therapist_queue` room, immediately updating all therapist interfaces with the new queue entry.

Comprehensive timestamp recording at each state transition (`created_at`, `selection_confirmed_at`, `therapist_confirmed_at`, `service_start_at`, `service_finish_at`, `cashier_claimed_at`, `paid_at`) provides complete audit trails for operational analysis, performance monitoring, and dispute resolution. This temporal data enables calculation of key performance indicators such as average wait times, service durations, and throughput rates.

**Data Model and Domain Organization**

The data model comprises ten normalized entities organized into three logical domains aligned with business concepts. The **Service Domain** implements a three-level hierarchy: ServiceCategory (e.g., "Massage", "Facial"), Service (e.g., "Swedish Massage"), and ServiceClassification (e.g., "30 minutes - $50", "60 minutes - $80"), enabling flexible pricing structures and service variants without data duplication. The **Transaction Domain** manages the complete order lifecycle through Transaction (header), TransactionItem (line items), Payment (financial records), and TransactionCounter (sequential code generation). The **User Domain** represents system actors (Therapist, Cashier) and physical resources (Room), supporting authentication, authorization, and resource allocation.

**Security Architecture**

The multi-layered security architecture addresses authentication, authorization, input validation, and data protection. Password security employs Werkzeug's `generate_password_hash()` function implementing bcrypt-compatible hashing with automatic salt generation and configurable work factors, ensuring computational resistance to brute-force attacks. Token-based authentication generates unique session tokens upon successful login, stored in browser SessionStorage and validated on each protected route access. Token expiration after 24 hours limits the window of vulnerability if tokens are compromised.

Role-based access control (RBAC) restricts functionality based on user role: customers access only service selection interfaces, therapists access queue management and service delivery functions, cashiers access payment processing, and monitors access read-only system-wide dashboards. Authorization checks occur at both route level (decorator-based) and Socket.IO event handler level, ensuring that even direct API manipulation cannot bypass access controls.

SQL injection prevention is achieved through SQLAlchemy's parameterized query mechanism, which separates SQL structure from user-supplied data, preventing malicious input from altering query semantics. Cross-site scripting (XSS) protection employs Jinja2's automatic HTML escaping, converting potentially dangerous characters (`<`, `>`, `&`, `"`, `'`) to their HTML entity equivalents before rendering in templates. Cross-site request forgery (CSRF) protection utilizes Flask's signed session cookies, preventing attackers from forging requests on behalf of authenticated users.

**Performance Optimization Strategies**

The architecture implements multiple performance optimization techniques addressing different bottlenecks. Eventlet's asynchronous I/O model based on greenlets (lightweight coroutines) enables efficient handling of hundreds of concurrent WebSocket connections without the memory overhead of thread-per-connection models. Context switching between greenlets occurs only during I/O operations, maximizing CPU utilization for I/O-bound workloads typical of web applications.

Database connection pooling via SQLAlchemy maintains a pool of persistent database connections, reusing them across requests rather than establishing new connections for each operation. This eliminates the overhead of TCP handshakes, authentication, and connection initialization, significantly improving response times for database-intensive operations. Query optimization through selective column loading, relationship lazy loading, and appropriate indexing (primary keys, foreign keys, unique constraints) minimizes data transfer and query execution time.

Client-side optimization strategies include LocalStorage caching for shopping cart persistence (reducing server requests for cart operations), SessionStorage for authentication tokens (enabling client-side authorization checks before server round-trips), and efficient DOM manipulation through targeted element updates rather than full page reloads. The Socket.IO client library implements automatic message batching and compression, reducing network bandwidth consumption for high-frequency updates.

**Scalability and Deployment Considerations**

The stateless authentication design (token-based rather than server-side sessions) enables horizontal scaling through load balancers distributing traffic across multiple application server instances. Each server operates independently, validating tokens against the shared database without requiring session replication or sticky sessions. For high-availability deployments, Socket.IO supports Redis adapter integration, enabling WebSocket connections distributed across multiple servers to receive synchronized event broadcasts through a shared Redis pub/sub channel.

The database-backed state management approach centralizes all persistent state in MySQL, eliminating application server state and enabling seamless failover to backup servers. Database replication (master-slave or multi-master) provides redundancy and read scalability, with write operations directed to the master and read operations distributed across replicas. For extreme scale requirements, database sharding by spa location or date range could partition data across multiple database instances.

This comprehensive architectural design successfully addresses the complex requirements of concurrent multi-role spa management operations while maintaining code clarity, operational reliability, and future extensibility. The architecture demonstrates mature software engineering practices including separation of concerns, defense in depth security, performance optimization, and scalability planning, providing a solid foundation for production deployment and long-term maintenance.

---

## Usage Recommendations

**For Thesis Chapter 3:**
- Use **Version 1** (main overview) for comprehensive coverage
- Include all five key principles with explanations
- Suitable for 3-5 page architecture section

**For Thesis Defense Presentation:**
- Use **Version 2** (concise) for slides
- Focus on three critical requirements
- Suitable for 2-3 minute verbal explanation

**For Technical Documentation:**
- Use **Version 3** (detailed) for developer onboarding
- Includes implementation details and rationale
- Suitable for technical reference manual

**For Academic Paper/Conference:**
- Use **Version 2** with selected paragraphs from Version 1
- Balance between brevity and completeness
- Suitable for 2-3 page constraint

---

## Integration with Existing Documentation

This overview should be placed at the beginning of your System Architecture section (3.3.1), followed by:

- 3.3.2 Architectural Pattern (detailed layer descriptions)
- 3.3.3 System Components (individual component details)
- 3.3.4 Data Flow Architecture (sequence diagrams)
- 3.3.5 Communication Architecture (WebSocket details)
- 3.3.6 Database Architecture (ERD and schema)
- 3.3.7 Security Architecture (detailed security mechanisms)
- 3.3.8 Performance Optimization (specific techniques)
- 3.3.9 System Workflow (step-by-step processes)
- 3.3.10 Technology Justification (why each technology)
- 3.3.11 Architecture Diagram (visual representation)
- 3.3.12 Summary (key strengths and conclusion)
