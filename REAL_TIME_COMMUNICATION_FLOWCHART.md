# Real-Time Communication Flowchart

```mermaid
flowchart TD
    subgraph Phase1["Phase 1: Service Selection"]
        A1[[Customer<br/>customer_confirm_selection(cart)]] --> A2[[SocketIO Server<br/>INSERT Transaction & TransactionItems]]
        A2 --> A3[[SocketIO Server<br/>Generate code (TransactionCounter)]]
        A3 --> A4[[SocketIO Server → Therapists<br/>broadcast(therapist_queue_updated)]]
        A4 --> A5[[SocketIO Server → Customer<br/>emit(customer_selection_received)]]
    end

    subgraph Phase2["Phase 2: Service Delivery"]
        A5 --> B1[[Therapist<br/>therapist_confirm_next(token)]]
        B1 --> B2[[SocketIO Server → Database<br/>SELECT FOR UPDATE SKIP LOCKED]]
        B2 --> B3[[Database<br/>Row-level lock acquired]]
        B3 --> B4[[SocketIO Server → Database<br/>UPDATE therapist_id, room_number]]
        B4 --> B5[[SocketIO Server → Therapists<br/>broadcast(therapist_queue_updated)]]
        B5 --> B6[[Therapist<br/>therapist_start_service(txn_id)]]
        B6 --> B7[[SocketIO Server → Database<br/>UPDATE status = in_service]]
        B7 --> B8[[Therapist<br/>therapist_add_service(service_id)]]
        B8 --> B9[[SocketIO Server → Database<br/>INSERT TransactionItem]]
        B9 --> B10[[SocketIO Server → Database<br/>Recalculate totals]]
        B10 --> B11[[Therapist<br/>therapist_finish_service(txn_id)]]
        B11 --> B12[[SocketIO Server → Database<br/>UPDATE status = finished]]
        B12 --> B13[[SocketIO Server → Cashiers<br/>broadcast(cashier_queue_updated)]]
    end

    subgraph Phase3["Phase 3: Payment"]
        B13 --> C1[[Cashier<br/>cashier_claim_next(token)]]
        C1 --> C2[[SocketIO Server → Database<br/>SELECT FOR UPDATE SKIP LOCKED]]
        C2 --> C3[[SocketIO Server → Database<br/>UPDATE cashier_id]]
        C3 --> C4[[Cashier<br/>cashier_pay(amount)]]
        C4 --> C5[[SocketIO Server<br/>Calculate change]]
        C5 --> C6[[SocketIO Server → Database<br/>INSERT Payment]]
        C6 --> C7[[SocketIO Server → Database<br/>UPDATE status = paid]]
    end

    C7 --> End[[Transaction complete]]
```
