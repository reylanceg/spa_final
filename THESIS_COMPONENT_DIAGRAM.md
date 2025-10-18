# Component Architecture Diagram

## Flask SPA Management System - Component View

```mermaid
graph LR
    subgraph Presentation_Layer[Presentation Layer]
        UI_Customer[Customer UI<br/>home.html / services*.html]
        UI_Therapist[Therapist UI<br/>therapist.html]
        UI_Cashier[Cashier UI<br/>cashier.html]
        UI_Monitor[Monitor Dashboard<br/>monitor.html]
        UI_Auth[Login Pages]
    end

    subgraph Controller_Layer[Flask Blueprints]
        BP_Customer[customer.py]
        BP_Therapist[therapist.py]
        BP_Cashier[cashier.py]
        BP_Monitor[monitor.py]
        BP_Auth[auth.py]
    end

    subgraph Service_Layer[Shared Services]
        AppFactory[app/__init__.py<br/>Application Factory]
        SocketHandlers[socketio_events.py<br/>Socket.IO Events]
        AuthHelpers[utils/auth_helpers.py]
        BusinessLogic[Queue & Payment Rules]
    end

    subgraph Data_Layer[Data Access]
        Models[models.py<br/>SQLAlchemy Models]
        Extensions[extensions.py<br/>db · socketio · bcrypt]
        CodeGenerator[TransactionCounter]
    end

    Database[(MySQL Database<br/>InnoDB)]

    UI_Customer --> BP_Customer
    UI_Therapist --> BP_Therapist
    UI_Cashier --> BP_Cashier
    UI_Monitor --> BP_Monitor
    UI_Auth --> BP_Auth

    BP_Customer & BP_Therapist & BP_Cashier & BP_Monitor & BP_Auth --> AppFactory
    BP_Therapist & BP_Cashier & BP_Monitor --> SocketHandlers
    BP_Therapist & BP_Cashier & BP_Auth --> AuthHelpers

    AppFactory --> Models
    SocketHandlers --> Models
    BusinessLogic --> BP_Customer & BP_Therapist & BP_Cashier

    Models --> Extensions --> Database
    CodeGenerator --> Models
```

## Academic Description

The revised component diagram highlights four logical tiers to clarify responsibilities. The **presentation layer** contains the role-specific Jinja templates and JavaScript that users interact with. These interfaces route requests to matching **Flask blueprints** (`customer.py`, `therapist.py`, `cashier.py`, `monitor.py`, `auth.py`), which act as controllers for each role.

Shared services sit behind the controllers. The application factory (`app/__init__.py`) registers blueprints and extensions, `socketio_events.py` delivers the real-time Socket.IO handlers, `utils/auth_helpers.py` centralizes token validation, and the domain-specific business rules coordinate queue and payment logic used by multiple roles.

Within the data access layer, SQLAlchemy models in `models.py` depend on the configured extensions (`extensions.py`) to communicate with the MySQL database, while `TransactionCounter` guarantees unique customer-facing codes. This layered structure makes the flow from user interface to persistence easy to trace, reinforcing separation of concerns and improving maintainability.
