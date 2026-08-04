import {
  MOCK_LATEST_PARTNER,
  MOCK_PERFORMANCE,
  MOCK_PLAYER_STYLE,
} from "./consts";

export function usePlayerOverviewData() {
  return {
    playerStyle: MOCK_PLAYER_STYLE,
    partner: MOCK_LATEST_PARTNER,
    performance: MOCK_PERFORMANCE,
  };
}
