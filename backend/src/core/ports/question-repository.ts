import { Question, CreateQuestionInput } from '../entities/question';

export interface QuestionRepository {
  create(input: CreateQuestionInput): Promise<Question>;
  findById(questionId: string): Promise<Question | null>;
  findByUser(userId: string, limit: number, nextToken?: string): Promise<{ questions: Question[]; nextToken?: string }>;
  findAll(limit: number): Promise<Question[]>;
  delete(questionId: string): Promise<void>;
}
