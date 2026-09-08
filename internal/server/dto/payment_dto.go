package dto

type CreatePaymentRequest struct {
	NumberOfMonths  int    `json:"numberOfMonths" validate:"required,min=1,max=12"`
	ReferenceNumber string `json:"referenceNumber" validate:"required,max=50"`
	BankName        string `json:"bankName" validate:"required,max=80"`
	AmountBs        int64  `json:"amountBs" validate:"required,min=1"`
	AmountUsd       int64  `json:"amountUsd" validate:"required,min=1"`
	PriceBcv        int64  `json:"priceBcv" validate:"required,min=1"`
	Identification  string `json:"identification" validate:"required,max=20"`
	IsDiscount      bool   `json:"isDiscount"`
	PaidAt          string `json:"paidAt" validate:"required"`
}

type UpdatePaymentRequest struct {
	StatusID          string  `json:"statusId" validate:"required,uuid"`
	RejectionReasonID *string `json:"rejectionReasonId" validate:"omitempty,uuid"`
	RejectionMessage  *string `json:"rejectionMessage" validate:"omitempty,max=200"`
}

type PaymentUserResponse struct {
	ID           string  `json:"id"`
	Email        string  `json:"email"`
	AuthProvider string  `json:"authProvider"`
	IsPremium    bool    `json:"isPremium"`
	IsAnonymous  bool    `json:"isAnonymous"`
	PremiumUntil *string `json:"premiumUntil"`
}

type PaymentStatusResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type RejectionReasonResponse struct {
	ID     string `json:"id"`
	Reason string `json:"reason"`
}

type PaymentResponse struct {
	ID                string                   `json:"id"`
	UserID            string                   `json:"userId"`
	NumberOfMonths    int                      `json:"numberOfMonths"`
	ReferenceNumber   string                   `json:"referenceNumber"`
	BankName          string                   `json:"bankName"`
	AmountBs          int64                    `json:"amountBs"`
	AmountUsd         int64                    `json:"amountUsd"`
	PriceBcv          int64                    `json:"priceBcv"`
	Identification    string                   `json:"identification"`
	IsDiscount        bool                     `json:"isDiscount"`
	PaidAt            string                   `json:"paidAt"`
	StatusID          string                   `json:"statusId"`
	RejectionReasonID *string                  `json:"rejectionReasonId,omitempty"`
	RejectionMessage  *string                  `json:"rejectionMessage,omitempty"`
	ApprovedAt        *string                  `json:"approvedAt,omitempty"`
	RejectedAt        *string                  `json:"rejectedAt,omitempty"`
	CreatedAt         string                   `json:"createdAt"`
	UpdatedAt         string                   `json:"updatedAt"`
	DeletedAt         *string                  `json:"deletedAt,omitempty"`
	User              PaymentUserResponse      `json:"user"`
	PaymentStatus     *PaymentStatusResponse   `json:"paymentStatus"`
	RejectionReason   *RejectionReasonResponse `json:"rejectionReason,omitempty"`
}
