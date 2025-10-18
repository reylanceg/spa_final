# 3.5 Entity Relationship Diagram (ERD) - PART 1: Overview & Entities

## 3.5.1 Overview

The Entity Relationship Diagram (ERD) represents the database schema of the SPA Management System, illustrating the entities (tables), their attributes (columns), and the relationships that govern data organization and integrity. The database design follows a relational model adhering to **Third Normal Form (3NF)** principles to minimize data redundancy, eliminate update anomalies, and ensure data consistency across the system.

The database schema consists of **10 interconnected entities** organized into four functional domains:

**1. Service Management Domain**
- ServiceCategory: High-level service grouping (e.g., Massage, Facial, Body Treatment)
- Service: Individual service offerings (e.g., Swedish Massage, Hot Stone Therapy)
- ServiceClassification: Pricing and duration tiers (e.g., 60min/₱500, 90min/₱700)

**2. User Management Domain**
- Therapist: Service provider accounts with authentication
- Cashier: Payment processor accounts with authentication

**3. Transaction Management Domain**
- Transaction: Customer service request lifecycle tracking
- TransactionItem: Individual service line items within transactions
- TransactionCounter: Sequential transaction code generator (singleton pattern)

**4. Supporting Domain**
- Payment: Financial transaction records and audit trail
- Room: Treatment room inventory and status management

Each entity is designed with specific data types, constraints, and relationships to support the system's operational requirements for concurrent multi-user service management, real-time queue tracking, and secure payment processing.

**Figure 3.X** presents the complete ERD showing all entities, attributes, primary keys, foreign keys, and cardinality notation following Crow's Foot notation.

![Entity Relationship Diagram - include your erd_clean.md diagram here]

---

## 3.5.2 Entity Descriptions

### 3.5.2.1 TransactionCounter Entity

**Purpose:**  
The TransactionCounter entity implements a **singleton pattern** for generating sequential 4-digit transaction codes, ensuring unique customer-facing identifiers across all transactions. This entity provides a centralized mechanism for code generation, preventing conflicts in concurrent transaction creation scenarios.

**Primary Key:**  
- `id` (INTEGER, AUTO_INCREMENT): Singleton record identifier (always contains exactly one record with id=1)

**Attributes:**
- `id` (INTEGER, PRIMARY KEY, NOT NULL): Primary key ensuring singleton pattern enforcement through business logic
- `next_number` (INTEGER, NOT NULL, DEFAULT 1): Stores the next available sequential number for transaction code generation. Incremented atomically with each new transaction.

**Business Rules:**
1. **Singleton Constraint**: The table contains exactly one record (id=1) throughout the system's lifetime
2. **Atomic Incrementation**: Each transaction retrieves and increments `next_number` within a database transaction to prevent duplicate codes
3. **Format Specification**: Numbers are formatted as 4-digit zero-padded strings (0001, 0002, ..., 9999) for customer-facing display
4. **Concurrency Safety**: Database row-level locking during code generation prevents race conditions when multiple customers confirm selections simultaneously
5. **Rollover Consideration**: After reaching 9999, the system requires administrative reset or can be extended to 5+ digits

**Code Generation Algorithm:**
```
1. BEGIN TRANSACTION
2. SELECT next_number FROM TransactionCounter WHERE id = 1 FOR UPDATE
3. current_code = retrieved next_number
4. UPDATE TransactionCounter SET next_number = next_number + 1 WHERE id = 1
5. COMMIT TRANSACTION
6. RETURN formatted_code (e.g., sprintf("%04d", current_code))
```

**Design Rationale:**  
Using a dedicated counter table instead of relying on Transaction.id provides several advantages:
- **Predictable Format**: Always produces exactly 4 digits regardless of database auto-increment gaps
- **Reset Capability**: Administrators can reset counter for new periods without affecting transaction IDs
- **Database Independence**: Works identically across MySQL, PostgreSQL, SQLite without dialect-specific auto-increment behavior
- **User Experience**: Sequential codes (0001, 0002) are easier for customers to remember and verbally communicate than random IDs

**Relationships:**  
None (utility table with no foreign key relationships)

**Example Data:**
| id | next_number |
|----|-------------|
| 1  | 47          |

*Interpretation: The next transaction will receive code "0047"*

---

### 3.5.2.2 ServiceCategory Entity

**Purpose:**  
The ServiceCategory entity organizes spa services into high-level classification groups, enabling hierarchical service navigation and categorized service presentation in the customer interface. Categories provide logical grouping for related services, improving user experience through organized browsing.

**Primary Key:**  
- `id` (INTEGER, AUTO_INCREMENT): Unique identifier for each service category

**Attributes:**
- `id` (INTEGER, PRIMARY KEY, NOT NULL): Auto-incrementing primary key ensuring unique category identification
- `category_name` (VARCHAR(100), UNIQUE, NOT NULL): Human-readable category name displayed in customer selection interface. Maximum length of 100 characters accommodates descriptive category names.

**Business Rules:**
1. **Uniqueness Constraint**: Category names must be unique across the system to prevent ambiguous categorizations and customer confusion
2. **Logical Grouping**: Each category represents a distinct service type aligned with spa industry standards (e.g., "Massage Therapy", "Facial Treatments", "Body Treatments", "Specialty Services")
3. **Cascade Deletion**: Removing a category cascades to delete all associated services, maintaining referential integrity
4. **Presentation Order**: Categories can be ordered for customer interface display (implemented at application layer)

**Relationships:**
- **One-to-Many with Service**: A single ServiceCategory can contain zero or more Services. Deleting a category cascades to remove all associated services, preventing orphaned service records.

**Example Data:**
| id | category_name        |
|----|---------------------|
| 1  | Massage Therapy     |
| 2  | Facial Treatments   |
| 3  | Body Treatments     |
| 4  | Specialty Services  |

**Design Considerations:**  
The separation of categories from services (rather than storing category as an attribute within the Service table) adheres to First Normal Form and enables:
- Consistent category naming across services
- Efficient category-based filtering queries
- Centralized category management (rename affects all services)
- Future extension for category attributes (description, image, sort order)

---

### 3.5.2.3 Service Entity

**Purpose:**  
The Service entity defines individual spa service offerings available for customer selection. Each service represents a distinct treatment option with associated descriptions, categorization, and multiple pricing/duration variants implemented through ServiceClassification relationships.

**Primary Key:**  
- `id` (INTEGER, AUTO_INCREMENT): Unique identifier for each service

**Foreign Keys:**
- `category_id` (INTEGER, FK → ServiceCategory.id, NULLABLE): References parent category for hierarchical organization. Nullable to accommodate uncategorized services during initial setup.

**Attributes:**
- `id` (INTEGER, PRIMARY KEY, NOT NULL): Auto-incrementing primary key
- `category_id` (INTEGER, FOREIGN KEY, NULLABLE): Optional category assignment enables flexible service organization
- `service_name` (VARCHAR(100), NOT NULL): Display name shown to customers in service selection interface. Does not require global uniqueness to accommodate multiple locations.
- `description` (VARCHAR(255), NULLABLE): Detailed service description providing marketing copy and treatment information visible in customer interface

**Business Rules:**
1. **Name Flexibility**: Service names need not be globally unique (e.g., multiple spa locations might independently define "Swedish Massage")
2. **Classification Requirement**: Services without associated ServiceClassifications exist in database but cannot be selected by customers (bookability requires at least one pricing tier)
3. **Category Optional**: Services can exist without category assignment during initial system setup, though best practices suggest all services should be categorized before customer access
4. **Description Guidelines**: Description field provides customer-facing information including treatment duration range, benefits, and special considerations

**Relationships:**
- **Many-to-One with ServiceCategory**: Each Service belongs to at most one category (optional participation)
- **One-to-Many with ServiceClassification**: Each Service has one or more classifications defining pricing tiers
- **One-to-Many with TransactionItem**: Services appear in multiple customer transactions over time

**Example Data:**
| id | category_id | service_name | description |
|----|-------------|--------------|-------------|
| 1  | 1           | Swedish Massage | Relaxing full-body massage using long, flowing strokes |
| 2  | 1           | Hot Stone Therapy | Heated stone massage promoting deep relaxation |
| 3  | 2           | Deep Cleansing Facial | Pore cleansing, exfoliation, and hydration treatment |
| 4  | 3           | Body Scrub | Exfoliating treatment removing dead skin cells |

**Design Rationale:**  
The three-level hierarchy (ServiceCategory → Service → ServiceClassification) provides flexibility for:
- Adding new services without price definition (staged setup)
- Maintaining service definitions while adjusting prices via classifications
- Offering same service at multiple price points/durations
- Analyzing service popularity independent of pricing tier

---

### 3.5.2.4 ServiceClassification Entity

**Purpose:**  
The ServiceClassification entity defines pricing and duration variants for each service, implementing a tiered pricing model where customers choose between different service durations (e.g., 60-minute, 90-minute, 120-minute sessions) at corresponding price points. This design enables flexible pricing strategies and accommodates customer budget/time preferences.

**Primary Key:**  
- `id` (INTEGER, AUTO_INCREMENT): Unique identifier for each classification variant

**Foreign Keys:**
- `service_id` (INTEGER, FK → Service.id, NOT NULL): References parent service definition. Mandatory participation ensures every classification belongs to a service.

**Attributes:**
- `id` (INTEGER, PRIMARY KEY, NOT NULL): Auto-incrementing primary key
- `service_id` (INTEGER, FOREIGN KEY, NOT NULL): Mandatory parent service reference
- `classification_name` (VARCHAR(100), NOT NULL): Duration or tier descriptor displayed to customers (e.g., "60 minutes", "90 minutes", "Premium Package")
- `price` (FLOAT, NOT NULL): Service cost in Philippine Peso (₱). Float data type accommodates decimal pricing (e.g., ₱499.50).
- `duration_minutes` (INTEGER, NOT NULL, DEFAULT 60): Service duration in minutes for scheduling calculations, room allocation, and service timer functionality

**Business Rules:**
1. **Multiple Tiers Per Service**: Single services support multiple classifications to accommodate varying customer budgets and time availability
2. **Positive Values**: Price and duration must be positive (enforced at application layer to prevent data entry errors)
3. **Naming Convention**: Classification names should clearly communicate the differentiating factor (typically duration: "60 min", "90 min", "120 min")
4. **Duration Precision**: Duration stored in minutes enables precise scheduling and service timer tracking
5. **Price Flexibility**: Prices can differ non-linearly (e.g., 90-min not necessarily 1.5× price of 60-min) to reflect value perception

**Relationships:**
- **Many-to-One with Service**: Each classification belongs to exactly one parent service
- **One-to-Many with TransactionItem**: Classifications are selected by customers and recorded in transactions

**Example Data:**
| id | service_id | classification_name | price  | duration_minutes |
|----|------------|-------------------|--------|------------------|
| 1  | 1          | 60 minutes        | 500.00 | 60               |
| 2  | 1          | 90 minutes        | 700.00 | 90               |
| 3  | 1          | 120 minutes       | 900.00 | 120              |
| 4  | 2          | 90 minutes        | 850.00 | 90               |
| 5  | 3          | 60 minutes        | 600.00 | 60               |

**Design Rationale:**  
Separating classifications from services (rather than storing price/duration as service attributes) provides:
- **Pricing Flexibility**: Single service offers multiple price points without service duplication
- **Temporal Pricing**: Can implement time-based pricing (weekday vs. weekend rates) through separate classifications
- **Promotional Pricing**: Add temporary promotional classifications without affecting standard pricing
- **Customer Choice**: Customers select duration matching their schedule and budget
- **Analytics**: Track which pricing tiers customers prefer for pricing strategy optimization

**Historical Note:**  
When service prices change, existing classifications can be updated or new ones added. However, historical transaction accuracy is preserved through TransactionItem's denormalized price storage (explained in section 3.5.2.8).

---

### 3.5.2.5 Therapist Entity

**Purpose:**  
The Therapist entity stores authentication credentials, personal information, and operational data for spa staff responsible for service delivery. This entity supports role-based access control, service assignment tracking, and therapist performance analytics. The entity implements secure authentication mechanisms following industry best practices for password storage and session management.

**Primary Key:**  
- `id` (INTEGER, AUTO_INCREMENT): Unique identifier for each therapist account

**Attributes:**
- `id` (INTEGER, PRIMARY KEY, NOT NULL): Auto-incrementing primary key
- `username` (VARCHAR(80), UNIQUE, NOT NULL): Login credential for system access. UNIQUE constraint prevents duplicate accounts and authentication conflicts.
- `password_hash` (VARCHAR(255), NOT NULL): Bcrypt-hashed password using PBKDF2-SHA256 algorithm. Never stores plain-text passwords.
- `name` (VARCHAR(120), UNIQUE, NOT NULL): Full name displayed in system interfaces, transaction records, and monitoring dashboards. UNIQUE constraint ensures unambiguous therapist identification.
- `room_number` (VARCHAR(20), NULLABLE): Assigned treatment room identifier (e.g., "Room 101", "VIP Suite"). Nullable to accommodate therapists without permanent room assignments or mobile therapists.
- `active` (BOOLEAN, DEFAULT TRUE): Account status flag implementing soft delete pattern. FALSE indicates inactive account while preserving historical transaction references.
- `auth_token` (VARCHAR(255), UNIQUE, NULLABLE): Session authentication token generated upon successful login. UNIQUE constraint prevents token collision.
- `token_expires_at` (DATETIME, NULLABLE): Token expiration timestamp implementing 24-hour token validity for security. Tokens beyond expiration are rejected by authentication middleware.

**Business Rules:**
1. **Username Uniqueness**: Each username must be globally unique to prevent authentication conflicts in login process
2. **Password Security**: Passwords hashed using Werkzeug's `generate_password_hash()` implementing PBKDF2-SHA256 with automatic salt generation (meeting OWASP guidelines)
3. **Soft Delete Pattern**: Setting `active=FALSE` deactivates account without deleting record, preserving referential integrity with historical transactions
4. **Token Lifecycle**: Authentication tokens generated at login, stored with 24-hour expiration, validated on each protected route access
5. **Room Assignment**: Therapists can have fixed room assignments or receive dynamic room allocation based on availability

**Security Considerations:**
- **Password Hashing**: PBKDF2-SHA256 algorithm with salt provides computational cost resisting brute-force attacks
- **Token Expiration**: 24-hour limit reduces unauthorized access window if token compromised
- **Unique Tokens**: UNIQUE constraint prevents token reuse across multiple sessions
- **No Plain Text**: password_hash never contains readable passwords, protecting credentials in data breach scenarios

**Relationships:**
- **One-to-Many with Transaction**: Each therapist serves multiple customers over time. Historical transactions reference therapist even after account deactivation.

**Example Data:**
| id | username   | name         | room_number | active | auth_token | token_expires_at      |
|----|-----------|--------------|-------------|--------|------------|-----------------------|
| 1  | therapist1 | Maria Santos | Room 101    | TRUE   | [token]    | 2024-01-16 14:30:00   |
| 2  | therapist2 | Juan Cruz    | Room 102    | TRUE   | NULL       | NULL                  |
| 3  | therapist3 | Lisa Garcia  | NULL        | FALSE  | NULL       | NULL                  |

**Design Rationale:**  
The Therapist entity mirrors the Cashier entity structure for consistency, enabling potential unified user management in future system iterations. The authentication mechanism supports both token-based (for API/mobile clients) and session-based (for web browsers) authentication patterns.

---

### 3.5.2.6 Cashier Entity

**Purpose:**  
The Cashier entity manages authentication and operational data for payment processing staff responsible for transaction finalization. The entity structure mirrors the Therapist entity for consistency while serving distinct functional requirements in the payment workflow.

**Primary Key:**  
- `id` (INTEGER, AUTO_INCREMENT): Unique identifier for each cashier account

**Attributes:**
- `id` (INTEGER, PRIMARY KEY, NOT NULL): Auto-incrementing primary key
- `username` (VARCHAR(80), UNIQUE, NOT NULL): Login credential for cashier dashboard access
- `password_hash` (VARCHAR(255), NOT NULL): Bcrypt-hashed password using identical security mechanism as Therapist
- `name` (VARCHAR(120), UNIQUE, NOT NULL): Full name displayed in system interfaces and printed on payment receipts for accountability
- `counter_number` (VARCHAR(20), NULLABLE): Payment counter or station identifier (e.g., "Counter 1", "Station A") for physical workspace association
- `active` (BOOLEAN, DEFAULT TRUE): Account status flag for soft delete pattern
- `auth_token` (VARCHAR(255), UNIQUE, NULLABLE): Session authentication token
- `token_expires_at` (DATETIME, NULLABLE): Token expiration timestamp (24-hour validity)

**Business Rules:**
1. **Unified Authentication**: Identical authentication mechanism to Therapist for consistent security model across user roles
2. **Receipt Attribution**: Cashier name appears on payment receipts, providing transaction accountability for financial audits
3. **Counter Assignment**: Counter number identifies physical payment station, enabling workload distribution tracking
4. **Financial Responsibility**: Active flag prevents account deletion with payment history, maintaining financial audit trail
5. **Shift Tracking**: Authentication timestamps enable shift-based reporting for cashier performance analysis

**Security Considerations:**
- **Payment Accountability**: Every payment record references cashier_id, creating non-repudiable audit trail
- **Token Security**: Identical 24-hour expiration and UNIQUE constraints as Therapist
- **Password Protection**: PBKDF2-SHA256 hashing prevents credential exposure

**Relationships:**
- **One-to-Many with Transaction** (via assigned_cashier_id): Cashier claims transactions for payment processing
- **One-to-Many with Payment**: Cashier processes multiple payment records, each attributed for audit trail

**Example Data:**
| id | username  | name          | counter_number | active | auth_token | token_expires_at      |
|----|-----------|---------------|----------------|--------|------------|-----------------------|
| 1  | cashier1  | Ana Reyes     | Counter 1      | TRUE   | [token]    | 2024-01-16 15:00:00   |
| 2  | cashier2  | Pedro Garcia  | Counter 2      | TRUE   | NULL       | NULL                  |

**Design Rationale:**  
The parallel structure between Therapist and Cashier entities enables:
- Consistent authentication logic across roles
- Potential unified user management interface
- Role-based access control with similar attribute sets
- Future extension to multi-role accounts (staff members who are both therapist and cashier)

---

## [Continue to Part 2 for Transaction, TransactionItem, Payment, and Room entities...]
