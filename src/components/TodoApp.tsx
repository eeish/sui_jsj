import React, { useState, useEffect, useCallback } from 'react'
import { Transaction } from '@mysten/sui/transactions'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import type { WalletAccount } from '@mysten/wallet-standard'

interface TodoAppProps {
  account: WalletAccount
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any // Using any for SuiClient compatibility between dapp-kit and sui.js versions
  packageId: string
}

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: number;
}

export const TodoApp: React.FC<TodoAppProps> = ({ 
  account, 
  client, 
  packageId
}) => {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [todoListId, setTodoListId] = useState<string>('')
  const [todoListTasks, setTodoListTasks] = useState<string[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchingTodoList, setFetchingTodoList] = useState(false)

  const fetchTodoList = useCallback(async () => {
    if (packageId === 'YOUR_PACKAGE_ID_HERE') return

    setFetchingTodoList(true)
    try {
      const objects = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${packageId}::todo::TodoList`
        },
        options: {
          showContent: true,
          showType: true
        }
      })

      if (objects.data.length > 0) {
        const todoListObj = objects.data[0]
        if (todoListObj.data?.content && 'fields' in todoListObj.data.content) {
          const fields = todoListObj.data.content.fields as { tasks?: string[] }
          setTodoListId(todoListObj.data.objectId)
          setTodoListTasks(fields.tasks || [])
          console.log('TodoList found:', todoListObj.data.objectId)
        }
      } else {
        console.log('No TodoList found for user')
        setTodoListId('')
        setTodoListTasks([])
      }
    } catch (error) {
      console.error('Failed to fetch TodoList:', error)
      setError(`Failed to fetch TodoList: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setFetchingTodoList(false)
    }
  }, [client, account.address, packageId])

  const fetchTasks = useCallback(async () => {
    if (packageId === 'YOUR_PACKAGE_ID_HERE') return
    
    try {
      const objects = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${packageId}::todo::Task`
        },
        options: {
          showContent: true,
          showType: true
        }
      })

      const tasks: Task[] = []
      
      for (const obj of objects.data) {
        if (obj.data?.content && 'fields' in obj.data.content) {
          const fields = obj.data.content.fields as {
            title?: string;
            description?: string;
            completed?: boolean;
            created_at?: string;
          }
          tasks.push({
            id: obj.data.objectId,
            title: fields.title || '',
            description: fields.description || '',
            completed: fields.completed || false,
            createdAt: parseInt(fields.created_at || '0')
          })
        }
      }

      setTasks(tasks.sort((a, b) => b.createdAt - a.createdAt))
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      setError(`Failed to fetch tasks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [client, account.address, packageId])

  const createTodoList = useCallback(async () => {
    if (packageId === 'YOUR_PACKAGE_ID_HERE') {
      setError('Please configure PACKAGE_ID in environment variables')
      return
    }
    
    // Special handling for local networks
    const currentNetwork = import.meta.env.VITE_NETWORK || 'testnet'
    if (currentNetwork === 'local') {
      console.warn('Local network detected. Some wallet features may not work properly.')
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const tx = new Transaction()
      
      tx.moveCall({
        target: `${packageId}::todo::create_todo_list`,
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            console.log('TodoList created successfully')
            // Refresh TodoList to get the latest state
            setTimeout(() => fetchTodoList(), 1000)
          },
          onError: (error: Error) => {
            console.error('Failed to create TodoList:', error)
            setError(`Failed to create TodoList: ${error.message}`)
          }
        }
      )
    } catch (error) {
      console.error('Transaction failed:', error)
      setError(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [packageId, signAndExecute, fetchTodoList])

  const createTask = useCallback(async () => {
    if (!newTaskTitle.trim()) {
      setError('Task title is required')
      return
    }
    
    if (!todoListId) {
      setError('TodoList not found. Please create a TodoList first.')
      return
    }
    
    if (newTaskTitle.trim().length > 100) {
      setError('Task title must be 100 characters or less')
      return
    }
    
    if (newTaskDesc.trim().length > 500) {
      setError('Task description must be 500 characters or less')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const tx = new Transaction()
      
      tx.moveCall({
        target: `${packageId}::todo::create_task`,
        arguments: [
          tx.object(todoListId),
          tx.pure.vector('u8', Array.from(new TextEncoder().encode(newTaskTitle.trim()))),
          tx.pure.vector('u8', Array.from(new TextEncoder().encode(newTaskDesc.trim()))),
        ],
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            console.log('Task created successfully')
            setNewTaskTitle('')
            setNewTaskDesc('')
            // Refresh both TodoList and tasks to get latest state
            setTimeout(() => {
              fetchTodoList()
              fetchTasks()
            }, 1000)
          },
          onError: (error: Error) => {
            console.error('Failed to create task:', error)
            setError(`Failed to create task: ${error.message}`)
          }
        }
      )
    } catch (error) {
      console.error('Transaction failed:', error)
      setError(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [newTaskTitle, newTaskDesc, todoListId, packageId, signAndExecute, fetchTodoList, fetchTasks])

  const completeTask = useCallback(async (taskId: string) => {
    if (!taskId) {
      setError('Invalid task ID')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const tx = new Transaction()
      
      tx.moveCall({
        target: `${packageId}::todo::complete_task`,
        arguments: [tx.object(taskId)],
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            console.log('Task completed successfully')
            // Refresh both TodoList and tasks to get latest state
            setTimeout(() => {
              fetchTodoList()
              fetchTasks()
            }, 1000)
          },
          onError: (error: Error) => {
            console.error('Failed to complete task:', error)
            setError(`Failed to complete task: ${error.message}`)
          }
        }
      )
    } catch (error) {
      console.error('Transaction failed:', error)
      setError(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [packageId, signAndExecute, fetchTodoList, fetchTasks])

  // Load TodoList and tasks on mount and when account/package changes
  useEffect(() => {
    if (account && packageId !== 'YOUR_PACKAGE_ID_HERE') {
      fetchTodoList()
      fetchTasks()
    }
  }, [account, packageId, fetchTodoList, fetchTasks])

  // Optional: Listen to events for real-time updates (only for remote networks)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const setupEventListener = async () => {
      // Skip event subscription for local networks as they don't support WebSocket
      const currentNetwork = import.meta.env.VITE_NETWORK || 'testnet'
      if (currentNetwork === 'local') {
        console.log('Skipping event subscription for local network (WebSocket not supported)')
        return
      }

      try {
        unsubscribe = await client.subscribeEvent({
          filter: { Package: packageId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onMessage: (event: any) => {
            console.log('Received event:', event)
            
            if (event.type.includes('TaskCreated') || event.type.includes('TaskCompleted')) {
              fetchTasks()
              fetchTodoList()
            }
          }
        })
        console.log('Event subscription established successfully')
      } catch (error) {
        // Silently handle WebSocket connection failures for better UX
        if (error instanceof Error && (
          error.message.includes('WebSocket') || 
          error.message.includes('405') ||
          error.message.includes('1006')
        )) {
          console.warn('Event subscription not available (WebSocket connection failed). Using polling instead.')
        } else {
          console.error('Failed to setup event listener:', error)
        }
      }
    }

    if (account && packageId !== 'YOUR_PACKAGE_ID_HERE') {
      setupEventListener()
    }

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch (error) {
          // Ignore cleanup errors
          console.warn('Error during event subscription cleanup:', error)
        }
      }
    }
  }, [account, packageId, client, fetchTasks, fetchTodoList])

  // Polling fallback for local networks (since WebSocket events aren't supported)
  useEffect(() => {
    const currentNetwork = import.meta.env.VITE_NETWORK || 'testnet'
    
    if (currentNetwork === 'local' && account && packageId !== 'YOUR_PACKAGE_ID_HERE') {
      // Poll for updates every 5 seconds on local networks
      const pollInterval = setInterval(() => {
        fetchTasks()
      }, 5000)

      return () => {
        clearInterval(pollInterval)
      }
    }
  }, [account, packageId, fetchTasks])

  const isConfigured = packageId !== 'YOUR_PACKAGE_ID_HERE'

  if (!isConfigured) {
    return (
      <div className="todo-app">
        <div className="error">
          <h2>Configuration Required</h2>
          <p>Please set the VITE_PACKAGE_ID environment variable with your deployed contract package ID.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="todo-app">
      <h2>My Todo List</h2>
      
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {fetchingTodoList ? (
        <div className="loading-state">
          <p>🔍 Looking for your todo list...</p>
        </div>
      ) : !todoListId ? (
        <div className="setup">
          <p>Create your personal todo list to get started</p>
          <p className="setup-description">
            Your todo list will be stored securely on the Sui blockchain
          </p>
          <button 
            onClick={createTodoList} 
            disabled={loading}
            className="primary-button"
          >
            {loading ? '⏳ Creating...' : '📝 Create Todo List'}
          </button>
        </div>
      ) : (
        <div>
          <div className="todo-list-info">
            <h3>📋 Your Todo List</h3>
            <p className="todo-list-meta">
              TodoList ID: {todoListId.slice(0, 8)}...{todoListId.slice(-8)}
            </p>
            <p className="task-summary">
              {todoListTasks.length} task{todoListTasks.length !== 1 ? 's' : ''} in list • 
              {tasks.filter(t => t.completed).length} completed • 
              {tasks.filter(t => !t.completed).length} pending
            </p>
          </div>

          <div className="create-task">
            <h3>➕ Add New Task</h3>
            <input
              type="text"
              placeholder="Task title *"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              disabled={loading}
              maxLength={100}
            />
            <textarea
              placeholder="Task description (optional)"
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              disabled={loading}
              maxLength={500}
              rows={3}
            />
            <button 
              onClick={createTask} 
              disabled={loading || !newTaskTitle.trim()}
              className="primary-button"
            >
              {loading ? '⏳ Adding...' : '➕ Add Task'}
            </button>
          </div>

          <div className="tasks">
            <h3>📝 Tasks ({tasks.length})</h3>
            {tasks.length === 0 ? (
              <div className="empty-state">
                <p>No tasks yet. Create your first task above!</p>
              </div>
            ) : (
              <div className="task-list">
                {tasks.map((task) => (
                  <div key={task.id} className={`task ${task.completed ? 'completed' : 'pending'}`}>
                    <div className="task-content">
                      <h4>{task.title}</h4>
                      {task.description && <p className="task-description">{task.description}</p>}
                      <p className="task-meta">
                        Created: {new Date(task.createdAt).toLocaleDateString()}
                        {task.completed && <span className="completed-badge"> • Completed</span>}
                      </p>
                    </div>
                    <div className="task-actions">
                      {!task.completed && (
                        <button 
                          onClick={() => completeTask(task.id)}
                          disabled={loading}
                          className="complete-button"
                          aria-label={`Complete task: ${task.title}`}
                        >
                          ✓ Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}