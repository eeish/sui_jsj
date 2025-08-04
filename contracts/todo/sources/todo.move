/*
/// Module: todo
module todo::todo;
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions


module todo::todo {
    use sui::event;
    use std::string::{Self as string, String};

    // 错误码
    const ENotOwner: u64 = 0;

    // Event定义
    public struct TaskCreated has copy, drop {
        task_id: ID,
        owner: address,
        title: String,
        created_at: u64,
    }

    public struct TaskCompleted has copy, drop {
        task_id: ID,
        owner: address,
        completed_at: u64,
    }

    // 任务结构
    public struct Task has key, store {
        id: UID,
        title: String,
        description: String,
        completed: bool,
        created_at: u64,
        owner: address,
    }

    // 任务列表
    public struct TodoList has key {
        id: UID,
        owner: address,
        tasks: vector<ID>,
    }

    // 创建任务列表
    public entry fun create_todo_list(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        
        let todo_list = TodoList {
            id: object::new(ctx),
            owner: sender,
            tasks: vector[],
        };

        transfer::transfer(todo_list, sender);
    }

    // 创建任务
    public entry fun create_task(
        todo_list: &mut TodoList,
        title: vector<u8>,
        description: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(todo_list.owner == sender, ENotOwner);

        let task = Task {
            id: object::new(ctx),
            title: string::utf8(title),
            description: string::utf8(description),
            completed: false,
            created_at: tx_context::epoch_timestamp_ms(ctx),
            owner: sender,
        };

        let task_id = object::id(&task);
        todo_list.tasks.push_back(task_id);

        // 发送Event
        event::emit(TaskCreated {
            task_id,
            owner: sender,
            title: task.title,
            created_at: task.created_at,
        });

        transfer::transfer(task, sender);
    }

    // 完成任务
    public entry fun complete_task(
        task: &mut Task,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(task.owner == sender, ENotOwner);
        
        task.completed = true;
        
        // 发送完成Event
        event::emit(TaskCompleted {
            task_id: object::id(task),
            owner: sender,
            completed_at: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    // 只读函数：获取任务信息
    public fun get_task_info(task: &Task): (String, String, bool, u64) {
        (task.title, task.description, task.completed, task.created_at)
    }
}