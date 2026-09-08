package models

import (
	"github.com/google/uuid"

	"github.com/edorguez/merki/pkg/models"
)

// Cart represents a shopping cart
type Cart struct {
	models.BaseModel
	SupermarketID     uuid.UUID    `gorm:"type:uuid;not null"`
	UserID            uuid.UUID    `gorm:"type:uuid;not null"`
	LocalID           string       `gorm:"column:local_id;type:text;index"`
	IsActive          bool         `gorm:"not null;default:true"`
	HasBudget         bool         `gorm:"column:has_budget;not null"`
	BudgetBs          *int64       `gorm:"type:bigint"` // NULL when the cart has no budget
	BudgetUsd         *int64       `gorm:"type:bigint"` // NULL when the cart has no budget
	TotalEstimatedBs  *int64       `gorm:"type:bigint"`
	TotalEstimatedUsd *int64       `gorm:"type:bigint"`
	Supermarket       *Supermarket `gorm:"foreignKey:SupermarketID"`
}

// NewCart creates a new Cart with default values
func NewCart(
	userID,
	supermarketID uuid.UUID,
	isActive,
	hasBudget bool,
	budgetBs,
	budgetUsd *int64,
) *Cart {
	cart := &Cart{
		UserID:            userID,
		SupermarketID:     supermarketID,
		IsActive:          isActive,
		HasBudget:         hasBudget,
		BudgetBs:          budgetBs,
		BudgetUsd:         budgetUsd,
		TotalEstimatedBs:  nil,
		TotalEstimatedUsd: nil,
	}
	return cart
}
