export interface RegisteredTeamsListTeam {
  id: string;
  player1DisplayName: string;
  player2DisplayName: string;
}

export type RegisteredTeamsListProps = {
  teams: RegisteredTeamsListTeam[];
  isLoading: boolean;
};
