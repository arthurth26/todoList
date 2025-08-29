import React, { type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Todo {
    id?: number;
    text: string;
    completed: boolean;
}

interface WorkerMessage {
    type: string;
    data?: Todo | number | Todo[];
    error?: string;
}

export function TodoApp() {
    const [newTodo, setNewTodo] = React.useState<string>('');
    const queryClient = useQueryClient();
    const [worker, setWorker] = React.useState<Worker | null>(null);

    React.useEffect(() => {
        const dbWorker = new Worker(new URL('../worker/fetchAndPostWorker.ts', import.meta.url));
        setWorker(dbWorker);

        dbWorker.onmessage = (e: MessageEvent<WorkerMessage>) => {
            const {type, data, error} = e.data;

            switch (type) {
                case 'todosLoaded':
                    queryClient.setQueryData(['todos'], data);
                    break;
                case 'error':
                    console.error('worker error', error);
                    break;
                default:
                    break;
            }
        };

        return () => {
            dbWorker.terminate();
        }
    }, [queryClient])

    const { data: todos = [], isLoading} = useQuery<Todo[], Error>({
        queryKey: ['todos'],
        queryFn: async () => {
            if (!worker) throw new Error('Worker not initialized');
            return new Promise<Todo[]>((resolve, reject) => {
                worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
                    if (e.data.type === 'todosLoaded') {
                        resolve(e.data.data as Todo[]);
                    } else if (e.data.type === 'error') {
                        reject(new Error(e.data.error));
                    }
                };
                worker.postMessage({type:'loadTodos'})
            });
        }
    });

    const addTodoMutation = useMutation<void, Error, Todo>({
        mutationFn: async (todo) => {
            if (!worker) throw new Error('Worker not initialized');
            return new Promise((resolve, reject) => {
                worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
                    if (e.data.type === 'todosLoaded') {
                        resolve();
                    } else if (e.data.type === 'error') {
                        reject (new Error(e.data.error));
                    }
                };
                worker.postMessage({type: 'addTodo', data:todo})
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey:['todos']});
        },
    });

    const toggleTodoMutation = useMutation<void, Error, number>({
        mutationFn: async(id:number) => {
            if (!worker) throw new Error('Worker not initialized');
            return new Promise((resolve, reject) => {
                worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
                    if (e.data.type === 'todosLoaded') {
                        resolve();
                    } else if (e.data.type === 'error') {
                        reject (new Error(e.data.error));
                    }
                };
                worker.postMessage({type:'toggleTodo', data: id})
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['todos']});
        }
    });

    const deleteTodoMutation = useMutation<void, Error, number>({
        mutationFn: async(id) => {
            if (!worker) throw new Error('Worker not INitialized');
            return new Promise((resolve, reject) => {
                worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
                    if (e.data.type === 'todosLoaded') {
                        resolve();
                    } else if (e.data.type === 'error') {
                        reject (new Error(e.data.error))
                    }
                };
                worker.postMessage({type:'deleteTodo', data: id})
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['todos']})
        }
    });

    const addTodo = (e: FormEvent) => {
        e.preventDefault();
        if (!newTodo.trim()) return;
        addTodoMutation.mutate({text: newTodo, completed: false});
        setNewTodo('');
    };

    return (
        <div className="p-4 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Todo List</h1>
            <form onSubmit={addTodo} className="mb-4">
                <input type='text'
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="Add a todo"
                className="border p-2 mr-2"
                />
                <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                    Add
                </button>
            </form>

            {isLoading? (<p>Loading todos...</p>): 
            (<ul>
                {todos.map((todo) => (
                    <li key={todo.id} className="flex items-center mb-2">
                        <input type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodoMutation.mutate(todo.id!)}
                        className="mr-2"
                        disabled={toggleTodoMutation.isPending}
                        />
                        <span className={todo.completed? 'line-through':''}>
                            {todo.text}
                        </span>
                        <button onClick={()=>deleteTodoMutation.mutate(todo.id!)}
                            className="ml-auto text-red-500"
                            disabled={deleteTodoMutation.isPending}>
                            Delete
                        </button>
                    </li>
                ))}
            </ul>)}
        </div>
    )
}