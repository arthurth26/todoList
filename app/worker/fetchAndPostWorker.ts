interface Todo {
    id?: number;
    text: string;
    completed: boolean;
}

interface WorkerMessage {
    type: string;
    data?: Todo|number;
    error?: string
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const {type, data} = e.data;

    let db: IDBDatabase;

    const request: IDBOpenDBRequest = indexedDB.open('TodoDB', 1);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const database = (event.target as IDBOpenDBRequest).result;

        if (!database.objectStoreNames.contains('todos')) {
            database.createObjectStore('todos', {keyPath:'id', autoIncrement: true});
        }
    };

    async function loadTodos(database: IDBDatabase) {
        const transaction = database.transaction(['todos'], 'readonly');
        const store = transaction.objectStore('todos');
        const request = store.getAll();

        request.onsuccess = () => {
            self.postMessage({type: 'todosLoaded', data: request.result});
        };

        request.onerror = () => {
            self.postMessage({type: 'error', error: 'Error Loading todos'});
        };
    }

    async function toggleTodo(database:IDBDatabase, id:number) {
        const transaction = database.transaction(['todos'], 'readwrite');
        const store = transaction.objectStore('todos');
        const request = store.get(id);

        request.onsuccess = async () => {
            const todo = request.result as Todo | undefined;
            if (todo) {
                todo.completed = !todo.completed;
                const updateRequest = store.put(todo);
                updateRequest.onsuccess = async () => {
                    await loadTodos(database);
                };
            }
        };

        request.onerror = () => {
            self.postMessage({type: 'error', error: 'Error Toggling todo'});
        };
    }

    async function deleteTodo(database:IDBDatabase, id:number) {
        const transaction = database.transaction(['todos'], 'readwrite');
        const store = transaction.objectStore('todos');
        const request = store.delete(id);

        request.onsuccess = async () => {
            await loadTodos(database);
        };

        request.onerror = () => {
            self.postMessage({type: 'error', error:'Error deleting todo'});
        };
    }

    async function addTodo(database:IDBDatabase, todo:Todo) {
        const transaction = database.transaction(['todos'], 'readwrite');
        const store = transaction.objectStore('todos');
        const request = store.add(todo);

        request.onsuccess = async () => {
            await loadTodos(database);
        }

        request.onerror = () => {
            self.postMessage({type:'error',error:'Error adding todo'})
        }
    }

    request.onsuccess = async (event: Event) => {
        const database = (event.target as IDBOpenDBRequest).result;

        if (!database) {
            self.postMessage({type: 'error', error: 'DB intialize failed'})
            return;
        }

        db = database;

        switch (type) {
            case 'loadTodos':
                loadTodos(db);
                break;

            case 'addTodo':
                if (data && typeof data === 'object' && 'text' in data) {
                    addTodo(db, data as Todo)
                } else {
                    self.postMessage({type:'error', error:'invalid todo data'});
                }
                break;
            case 'toggleTodo':
                if (typeof data === 'number') {
                    toggleTodo(db, data);
                } else {
                    self.postMessage({type:'error', error:'invalid todo ID'});
                }
                break;
            case 'deleteTodo':
                if (typeof data === 'number') {
                    deleteTodo(db, data);
                } else {
                    self.postMessage({type:'error', error:'invalid todo ID'});
                }
                break;
            default:
                break;
        }

        request.onerror = () => {
            self.postMessage({type:'error', error:'Database initialization failed'})
        }

    }
}