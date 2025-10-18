# 3.5 Entity Relationship Diagram (ERD) - Tips & Template

## 🎯 Academic Writing Tips for ERD Section

### Key Success Factors

1. **Be Comprehensive**: Describe EVERY entity, attribute, and relationship
2. **Be Consistent**: Use same terminology throughout
3. **Be Precise**: Use exact technical terms (Primary Key, Foreign Key, cardinality)
4. **Be Justified**: Explain design decisions and business rules
5. **Be Academic**: Formal tone, third-person, present tense

---

## ✍️ Writing Guidelines

### DO ✅

- **Use present tense**: "The Transaction entity stores customer service requests"
- **Explain business rules**: "This ensures historical pricing accuracy when rates change"
- **Define cardinality clearly**: "One-to-Many (1:N)" or "Many-to-One (N:1)"
- **Explain denormalization**: "Price is stored redundantly to preserve historical accuracy"
- **Reference figures**: "As shown in Figure 3.X, the ERD consists of 10 entities"
- **Use technical terms**: "UNIQUE constraint", "CASCADE DELETE", "referential integrity"
- **Provide examples**: Show sample data for clarity

### DON'T ❌

- **First person**: Avoid "We designed..." or "I created..."
- **Casual language**: No "basically", "just", "simply"
- **Incomplete descriptions**: Don't list attributes without explaining their purpose
- **Missing justifications**: Always explain WHY decisions were made
- **Ignore relationships**: Every foreign key needs explanation

---

## 📐 Standard Entity Description Format

Use this template for EACH of your 10 entities:

```markdown
### 3.5.2.X [EntityName] Entity

**Purpose:**  
[1-2 sentences explaining what this entity represents and why it exists]

**Primary Key:**  
- `attribute_name` (TYPE, CONSTRAINTS): [Brief description]

**Foreign Keys:** _(if applicable)_
- `fk_name` (TYPE, FK → ReferencedEntity.attribute): [Purpose of relationship]

**Attributes:**
- `attribute1` (TYPE, CONSTRAINTS): [Description and purpose]
- `attribute2` (TYPE, CONSTRAINTS): [Description and purpose]
- ...

**Business Rules:**
1. [Rule explaining constraint or validation]
2. [Rule explaining business logic]
3. ...

**Relationships:**
- [Relationship type with other entities]

**Example Data:** _(optional but recommended)_
| id | attr1 | attr2 |
|----|-------|-------|
| 1  | value | value |

**Design Rationale:** _(if special considerations exist)_
[Explanation of any denormalization, special constraints, or unusual design choices]
```

---

## 📋 Standard Relationship Description Format

For EACH relationship between entities:

```markdown
### 3.5.3.X [Entity1] → [Entity2] (Cardinality)

**Cardinality:** [One-to-Many (1:N), Many-to-One (N:1), One-to-One (1:1), Many-to-Many (M:N)]

**Participation:**
- **[Entity1]**: [Mandatory/Optional] participation - [explanation]
- **[Entity2]**: [Mandatory/Optional] participation - [explanation]

**Foreign Key:** `Table.column` references `ReferencedTable.column`

**Referential Integrity Action:** [CASCADE DELETE / SET NULL / RESTRICT DELETE]

**Business Justification:**  
[Explain why this relationship exists and what business requirement it supports]

**Example:**
[Show concrete example with sample data]
```

---

## 📊 Section Structure Outline

Your 3.5 ERD section should follow this structure (4-5 pages):

```
3.5 Entity Relationship Diagram (ERD)

3.5.1 Overview (½ page)
   - Introduction to ERD
   - Database design philosophy (3NF)
   - List of 10 entities grouped by domain
   - Reference to ERD figure

3.5.2 Entity Descriptions (2-3 pages)
   3.5.2.1 TransactionCounter Entity
   3.5.2.2 ServiceCategory Entity
   3.5.2.3 Service Entity
   3.5.2.4 ServiceClassification Entity
   3.5.2.5 Therapist Entity
   3.5.2.6 Cashier Entity
   3.5.2.7 Transaction Entity (most detailed)
   3.5.2.8 TransactionItem Entity
   3.5.2.9 Payment Entity
   3.5.2.10 Room Entity

3.5.3 Relationship Descriptions (1 page)
   3.5.3.1 ServiceCategory → Service (1:N)
   3.5.3.2 Service → ServiceClassification (1:N)
   3.5.3.3 Service → TransactionItem (1:N)
   3.5.3.4 ServiceClassification → TransactionItem (1:N)
   3.5.3.5 Therapist → Transaction (1:N)
   3.5.3.6 Cashier → Transaction (1:N)
   3.5.3.7 Cashier → Payment (1:N)
   3.5.3.8 Transaction → TransactionItem (1:N)
   3.5.3.9 Transaction → Payment (1:1)
   3.5.3.10 Transaction → Room (N:1)

3.5.4 Normalization Analysis (½ page)
   - 1NF, 2NF, 3NF compliance
   - Controlled denormalization explanation
   - Design rationale

3.5.5 Integrity Constraints (½ page)
   - Entity integrity
   - Referential integrity
   - Domain integrity
   - User-defined integrity
```

---

## 🎨 Writing Style Examples

### Example 1: Entity Purpose (Good vs. Bad)

**❌ BAD:**
> "This table stores services."

**✅ GOOD:**
> "The Service entity defines individual spa service offerings available for customer selection, including service descriptions and categorization. Each service represents a distinct treatment option with multiple pricing/duration variants."

---

### Example 2: Attribute Description (Good vs. Bad)

**❌ BAD:**
> "- code: unique transaction number"

**✅ GOOD:**
> "- `code` (VARCHAR(4), UNIQUE, NOT NULL): Sequential 4-digit transaction identifier (e.g., '0001', '0002') displayed to customers for reference. Generated via TransactionCounter entity to ensure uniqueness and provide user-friendly format."

---

### Example 3: Business Rule (Good vs. Bad)

**❌ BAD:**
> "Username must be unique."

**✅ GOOD:**
> "Username must be unique across all therapist accounts to prevent authentication conflicts. The UNIQUE constraint at database level ensures no duplicate usernames can be created, even under concurrent registration attempts."

---

### Example 4: Relationship Description (Good vs. Bad)

**❌ BAD:**
> "Transaction has many items."

**✅ GOOD:**
> "The Transaction entity maintains a One-to-Many relationship with TransactionItem, where each transaction contains one or more service line items. This design implements a shopping cart model, enabling customers to select multiple services in a single visit while maintaining itemized tracking for receipt generation and service analytics."

---

## 🔍 Special Topics to Address

### 1. Denormalization Justification

Your TransactionItem entity stores `price` and `duration_minutes` redundantly. Explain this:

```
**Controlled Denormalization:**

TransactionItem intentionally stores price and duration_minutes (data that also 
exists in ServiceClassification) to preserve historical accuracy. While this 
violates strict Third Normal Form, it is essential for business requirements:

**Scenario:** Customer books 90-minute massage for ₱700 in January.
**Future Change:** Spa increases price to ₱800 in February.
**Result:** January transaction permanently displays ₱700 (historical accuracy).

Without denormalization, past transactions would retroactively show current 
prices, causing discrepancies in financial reports and customer records.
```

### 2. Enum Status Values

Transaction status is an ENUM with 8 values. Explain the workflow:

```
**Status ENUM Values:**

The Transaction.status attribute uses an enumerated type to enforce valid 
state values and prevent invalid data entry. The eight states represent the 
complete service lifecycle:

1. `selecting`: Customer browsing (not yet confirmed)
2. `pending_therapist`: Confirmed, awaiting therapist assignment
3. `therapist_confirmed`: Therapist assigned, preparing room
4. `in_service`: Service delivery in progress
5. `finished`: Service complete, awaiting payment
6. `awaiting_payment`: Cashier assigned, entering payment amount
7. `paying`: Payment processing in progress
8. `paid`: Transaction complete, cycle finished

State transitions follow strict workflow rules enforced at application layer.
```

### 3. Authentication Security

Therapist and Cashier store hashed passwords. Explain security:

```
**Password Security:**

The password_hash attribute stores passwords using Werkzeug's 
`generate_password_hash()` function, which implements the PBKDF2-SHA256 
algorithm with automatic salt generation. This approach ensures:

1. **Irreversibility**: Original passwords cannot be recovered from hashes
2. **Salt Protection**: Unique salt per password prevents rainbow table attacks
3. **Computational Cost**: Adaptive hashing with configurable work factors 
   resists brute-force attacks even as hardware improves
4. **Compliance**: Meets OWASP password storage guidelines

Plain-text passwords are never stored in the database, protecting user 
credentials even in the event of data breach.
```

---

## ⚡ Quick Start Guide

### Step 1: Write Overview (15 minutes)
- Introduce ERD concept
- State normalization approach (3NF)
- List 10 entities organized by domain
- Reference your ERD figure

### Step 2: Describe Entities (90 minutes = ~9 min per entity)
For EACH entity, write:
1. Purpose (why it exists)
2. Primary key explanation
3. Foreign keys (if any)
4. All attributes with data types and constraints
5. Business rules (2-4 rules minimum)
6. Relationships overview
7. Example data (optional)

**Order:** Start with simple entities (ServiceCategory), end with complex (Transaction)

### Step 3: Describe Relationships (60 minutes)
For EACH of 10 relationships:
1. State cardinality clearly
2. Explain participation (mandatory/optional)
3. Identify foreign key
4. State referential action (CASCADE, SET NULL, RESTRICT)
5. Justify business need
6. Provide example

### Step 4: Normalization Analysis (20 minutes)
- Confirm 1NF, 2NF, 3NF compliance
- Explain intentional denormalization (TransactionItem)
- Justify design decisions

### Step 5: Integrity Constraints (20 minutes)
- Entity integrity (PRIMARY KEY)
- Referential integrity (FOREIGN KEY)
- Domain integrity (NOT NULL, CHECK, ENUM)
- User-defined (UNIQUE constraints, business rules)

**Total Time: ~3 hours**

---

## 📝 Common Mistakes to Avoid

1. **❌ Listing attributes without explanation**
   - Don't just write: "id, name, price"
   - Explain each attribute's purpose and constraints

2. **❌ Ignoring nullable attributes**
   - If attribute is NULL-able, explain why
   - Example: "therapist_id is nullable because assignment occurs after creation"

3. **❌ Forgetting audit timestamps**
   - Your Transaction has 7 timestamps - explain their audit trail purpose

4. **❌ Not explaining UNIQUE constraints**
   - Transaction.code is UNIQUE - explain the business reason

5. **❌ Skipping CASCADE implications**
   - If you use CASCADE DELETE, explain what gets deleted and why

6. **❌ Missing cardinality notation**
   - Always state: "One-to-Many (1:N)" not just "has many"

7. **❌ Incomplete relationship descriptions**
   - For each FK, explain the business reason for the relationship

---

## 📚 Academic References

Include these in your references section:

1. **Database Normalization:**
   - Codd, E. F. (1970). A relational model of data for large shared data banks. *Communications of the ACM*, 13(6), 377-387.

2. **ERD Notation:**
   - Chen, P. P. (1976). The entity-relationship model—toward a unified view of data. *ACM Transactions on Database Systems*, 1(1), 9-36.

3. **Database Design:**
   - Elmasri, R., & Navathe, S. B. (2015). *Fundamentals of Database Systems* (7th ed.). Pearson.

4. **Referential Integrity:**
   - Date, C. J. (2003). *An Introduction to Database Systems* (8th ed.). Addison-Wesley.

---

## ✅ Quality Checklist

Before submitting, verify:

- [ ] All 10 entities described with complete attributes
- [ ] All 10 relationships explained with cardinality
- [ ] Every foreign key has referential action specified
- [ ] Business rules provided for each entity
- [ ] Denormalization justified (TransactionItem)
- [ ] Security measures explained (password hashing)
- [ ] Enum values documented (Transaction.status)
- [ ] UNIQUE constraints explained
- [ ] Timestamp audit trail described
- [ ] ERD figure referenced in text
- [ ] Consistent terminology throughout
- [ ] No first-person language
- [ ] All technical terms defined
- [ ] Examples provided where helpful

---

## 🚀 Ready to Write?

Use the companion file `ERD_SECTION_COMPLETE_CONTENT.md` for the actual content with all 10 entities and relationships already written based on your system!
