declare global {
  interface Window {
    env: {
      PUSH_PUBLIC_KEY: string;
      PUSH_PRIVATE_KEY: string;
      VERCEL_TOKEN: string;
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
    };
  }
}

// Declarative types for Vercel Edge Runtime
declare namespace VercelEdge {
  interface Request extends Request {
    env: {
      PUSH_PUBLIC_KEY: string;
      PUSH_PRIVATE_KEY: string;
      VERCEL_TOKEN: string;
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
    };
  }
}

// Extend global namespace
export {};

// Declare module for Vercel Edge Runtime
declare module 'vercel-edge' {
  export const env: {
    PUSH_PUBLIC_KEY: string;
    PUSH_PRIVATE_KEY: string;
    VERCEL_TOKEN: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  };
}

export {};
