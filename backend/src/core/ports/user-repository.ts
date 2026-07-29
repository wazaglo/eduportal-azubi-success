import { User, CreateUserInput, UpdateUserInput } from '../entities/user';

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  findById(userId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByCognitoSub(cognitoSub: string): Promise<User | null>;
  update(userId: string, input: UpdateUserInput): Promise<User>;
  delete(userId: string): Promise<void>;
  list(limit: number, nextToken?: string): Promise<{ users: User[]; nextToken?: string }>;
  listByRole(role: string, limit: number, nextToken?: string): Promise<{ users: User[]; nextToken?: string }>;
  countByRole(role: string): Promise<number>;
  countActive(): Promise<number>;
}
