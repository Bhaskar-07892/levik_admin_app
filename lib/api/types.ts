import type { components } from "./schema";

/** Response and request shapes generated from the API's OpenAPI document (`npm run api:types`). */
type S = components["schemas"];

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export type PlumberListItem = S["PlumberListItemResponseDto"];
export type PlumberDetail = S["PlumberDetailResponseDto"];
export type RetailerListItem = S["RetailerListItemResponseDto"];
export type RetailerDetail = S["RetailerDetailResponseDto"];
export type ProductDto = S["ProductResponseDto"];
export type CreateProductBody = S["CreateProductRequestDto"];
export type LabelBatch = S["LabelBatchResponseDto"];
export type ScanDto = S["ScanResponseDto"];
export type ScanReview = S["ScanReviewResponseDto"];
export type InvoiceListItem = S["InvoiceListItemResponseDto"];
export type InvoiceReview = S["InvoiceReviewResponseDto"];
export type CheckDto = S["CheckResponseDto"];
export type SchemeImpactDto = S["SchemeImpactResponseDto"];
export type StatusEventDto = S["StatusEventResponseDto"];
export type ApprovalResult = S["ApprovalResultResponseDto"];
export type RewardDto = S["RewardResponseDto"];
export type CreateRewardBody = S["CreateRewardRequestDto"];
export type RedemptionDto = S["RedemptionResponseDto"];
export type RedemptionReview = S["RedemptionReviewResponseDto"];
export type SchemeDto = S["SchemeResponseDto"];
export type SchemeWithSummary = S["SchemeWithSummaryResponseDto"];
export type SchemeParticipantDto = S["SchemeParticipantResponseDto"];
export type CreateSchemeBody = S["CreateSchemeRequestDto"];
export type LedgerEntry = S["PointsTransactionResponseDto"];
export type LedgerTotals = S["LedgerTotalsResponseDto"];
export type PointsBalance = S["PointsBalanceResponseDto"];
export type InventoryItem = S["InventoryItemResponseDto"];
export type InventorySummary = S["InventorySummaryResponseDto"];
export type TicketDto = S["SupportTicketResponseDto"];
export type AuditLogDto = S["AuditLogResponseDto"];
export type SettingsDto = S["SettingsResponseDto"];
export type DashboardDto = S["DashboardResponseDto"];
export type SearchResult = S["SearchResultDto"];
export type NotificationsDto = S["NotificationsResponseDto"];
export type AdminProfile = S["AdminProfileResponseDto"];

import type { paths } from "./schema";

/** Query-parameter type of a GET endpoint, e.g. `QueryOf<"/api/v1/admin/scans">`. */
export type QueryOf<P extends keyof paths> = paths[P] extends { get: { parameters: { query?: infer Q } } } ? NonNullable<Q> : never;
