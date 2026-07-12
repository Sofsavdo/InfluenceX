// Click Shop-API Prepare/Complete so'rovi maydonlari - rasmiy hujjatdagi nomlash bilan bir xil
// (snake_case, Click tomonidan shunday yuboriladi). class-validator bilan qattiq tekshirish
// qilinmaydi - imzo (sign_string) tekshiruvi asosiy xavfsizlik chegarasi hisoblanadi.
export class ClickWebhookDto {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id: string;
  merchant_trans_id: string;
  merchant_prepare_id?: string; // faqat Complete (action=1) so'rovida keladi
  amount: string;
  action: string; // "0" = Prepare, "1" = Complete
  error: string;
  error_note: string;
  sign_time: string;
  sign_string: string;
}
