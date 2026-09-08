package dto

type CreateCartRequest struct {
	SupermarketID  *string                   `json:"supermarketId" validate:"omitempty,uuid"`
	NewSupermarket *CreateSupermarketRequest `json:"newSupermarket" validate:"omitempty"`
	HasBudget      *bool                     `json:"hasBudget"`
	BudgetBs       *int64                    `json:"budgetBs" validate:"omitempty,gte=0"`
	BudgetUsd      *int64                    `json:"budgetUsd" validate:"omitempty,gte=0"`
}

type AddProductRequest struct {
	CartID        string  `json:"cartId"        validate:"required,uuid"`
	SupermarketID string  `json:"supermarketId" validate:"required,uuid"`
	Name          string  `json:"name"          validate:"required,max=100"`
	Barcode       *string `json:"barcode"       validate:"omitempty,max=50"`
	IsWeightBased bool    `json:"isWeightBased"`
	PriceUsd      int64   `json:"priceUsd"      validate:"required,min=0"`
	PriceBs       int64   `json:"priceBs"       validate:"required,min=0"`
	PriceBcv      int64   `json:"priceBcv"      validate:"min=0"`
	ImageUrl      *string `json:"imageUrl"      validate:"omitempty,max=500"`
	Quantity      int     `json:"quantity"      validate:"required,min=1"`
	IsManualEntry bool    `json:"isManualEntry"`
}

type UpdateCartProductRequest struct {
	CartID        string  `json:"cartId"        validate:"required,uuid"`
	Name          string  `json:"name"          validate:"required,max=100"`
	Barcode       *string `json:"barcode"       validate:"omitempty,max=50"`
	IsWeightBased bool    `json:"isWeightBased"`
	PriceUsd      int64   `json:"priceUsd"      validate:"required,min=0"`
	PriceBs       int64   `json:"priceBs"       validate:"required,min=0"`
	PriceBcv      int64   `json:"priceBcv"      validate:"min=0"`
	ImageUrl      *string `json:"imageUrl"      validate:"omitempty,max=500"`
	Quantity      int     `json:"quantity"      validate:"required,min=1"`
}

type UpdateProductQuantityRequest struct {
	CartProductID string `json:"cartProductId" validate:"required,uuid"`
	CartID        string `json:"cartId"        validate:"required,uuid"`
	Quantity      int    `json:"quantity"      validate:"required,min=1,max=9999"`
}

type CartResponse struct {
	ID                string `json:"id"`
	SupermarketID     string `json:"supermarketId"`
	SupermarketName   string `json:"supermarketName"`
	UserID            string `json:"userId"`
	IsActive          bool   `json:"isActive"`
	HasBudget         bool   `json:"hasBudget"`
	BudgetBs          *int64 `json:"budgetBs"`
	BudgetUsd         *int64 `json:"budgetUsd"`
	TotalEstimatedBs  *int64 `json:"totalEstimatedBs"`
	TotalEstimatedUsd *int64 `json:"totalEstimatedUsd"`
	CreatedAt         string `json:"createdAt"`
	UpdatedAt         string `json:"updatedAt"`
}

type CartProductResponse struct {
	ID            string  `json:"id"`
	CartID        string  `json:"cartId"`
	ProductID     string  `json:"productId"`
	Name          string  `json:"name"`
	PriceBs       int64   `json:"priceBs"`
	PriceUsd      int64   `json:"priceUsd"`
	ImageUrl      *string `json:"imageUrl"`
	Quantity      int     `json:"quantity"`
	IsManualEntry bool    `json:"isManualEntry"`
	CreatedAt     string  `json:"createdAt"`
	UpdatedAt     string  `json:"updatedAt"`
}

type CartProductDetailResponse struct {
	ID            string  `json:"id"`
	CartID        string  `json:"cartId"`
	ProductID     string  `json:"productId"`
	Name          string  `json:"name"`
	PriceBs       int64   `json:"priceBs"`
	PriceUsd      int64   `json:"priceUsd"`
	ImageUrl      *string `json:"imageUrl"`
	Quantity      int     `json:"quantity"`
	IsManualEntry bool    `json:"isManualEntry"`
	CreatedAt     string  `json:"createdAt"`
	UpdatedAt     string  `json:"updatedAt"`
}

type CartDetailResponse struct {
	ID                string                      `json:"id"`
	SupermarketID     string                      `json:"supermarketId"`
	SupermarketName   string                      `json:"supermarketName"`
	UserID            string                      `json:"userId"`
	IsActive          bool                        `json:"isActive"`
	HasBudget         bool                        `json:"hasBudget"`
	BudgetBs          *int64                      `json:"budgetBs"`
	BudgetUsd         *int64                      `json:"budgetUsd"`
	TotalEstimatedBs  *int64                      `json:"totalEstimatedBs"`
	TotalEstimatedUsd *int64                      `json:"totalEstimatedUsd"`
	CreatedAt         string                      `json:"createdAt"`
	UpdatedAt         string                      `json:"updatedAt"`
	Products          []CartProductDetailResponse `json:"products"`
}

func ResolveHasBudget(hasBudget *bool) bool {
	if hasBudget == nil {
		return true
	}
	return *hasBudget
}

// MissingBudgetAmounts reports whether a cart flagged as having a budget is
// missing either of its budget amounts. It is the single source of truth for
// the rule used both by the request validation and the sync service.
func MissingBudgetAmounts(hasBudget bool, budgetBs, budgetUsd *int64) bool {
	return hasBudget && (budgetBs == nil || budgetUsd == nil)
}
