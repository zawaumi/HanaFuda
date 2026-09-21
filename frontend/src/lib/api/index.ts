import { apiConfig } from "./config";
import type { HanaFudaDataSource } from "./data-source";
import { createMockDataSource } from "./mock-data-source";
import { createRemoteDataSource } from "./remote-data-source";

export { apiConfig, parseApiConfig } from "./config";
export { ApiError, isApiError } from "./errors";
export type {
  ApiErrorKind,
  ApiValidationIssue,
} from "./errors";
export type {
  ConversationQuery,
  HanaFudaDataSource,
  PersonQuery,
} from "./data-source";
export type * from "./types";

export function createDataSource(): HanaFudaDataSource {
  return apiConfig.mode === "remote"
    ? createRemoteDataSource()
    : createMockDataSource();
}

export const dataSource = createDataSource();
