// AI Brief Generator natijasi — CreateCampaignDto maydonlariga to'g'ridan-to'g'ri mos
// (business bu natijani ko'rib chiqib, kerak bo'lsa tahrirlab, kampaniya sifatida saqlaydi).
export interface BriefResultDto {
  title: string;
  description: string;
  objective: string;
  suggestedContentType: string;
  suggestedCollaborationModel: string;
  suggestedBudgetRangeUzs: { min: number; max: number };
  creatorRequirements: {
    minFollowers?: number;
    categories?: string[];
    languages?: string[];
  };
}
