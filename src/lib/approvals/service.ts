import {
  approveStoredApproval,
  getStoredApprovalById,
  listStoredApprovals,
  rejectStoredApproval,
} from "@/lib/db/repositories/approvals";
import type { TransactionRecord } from "@/lib/types";

export async function listApprovals() {
  return listStoredApprovals();
}

export async function getApprovalById(id: string) {
  return getStoredApprovalById(id);
}

export async function approveApproval(input: {
  approvalId: string;
  reviewerLabel?: string;
  reviewNotes?: string;
  network: string;
  transaction: TransactionRecord;
}) {
  return approveStoredApproval(input);
}

export async function rejectApproval(input: {
  approvalId: string;
  reviewerLabel?: string;
  reviewNotes?: string;
}) {
  return rejectStoredApproval(input);
}
