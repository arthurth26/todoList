import type { Route } from "./+types/home";
import { TodoApp } from "./interface";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <TodoApp/>
    </QueryClientProvider>
  );
}
