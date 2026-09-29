import { SessionRow } from "@/types/session";

/** `sunrise/db/response` carries every DB query's reply; only a get_sessions reply is a list of session rows. */
export function isSessionList(response: object[]): response is SessionRow[] {
  return response.every(r => "session_id" in r && "training_eligibility" in r);
}
