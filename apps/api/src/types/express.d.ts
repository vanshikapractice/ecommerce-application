declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: {
        sub: string;
        role: 'CUSTOMER' | 'ADMIN';
      };
    }
  }
}

export {};
