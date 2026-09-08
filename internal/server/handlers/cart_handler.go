package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/edorguez/merki/internal/server/dto"
	"github.com/edorguez/merki/internal/server/middleware"
	"github.com/edorguez/merki/internal/server/models"
	"github.com/edorguez/merki/internal/server/services"
	apperrors "github.com/edorguez/merki/pkg/core/errors"
	"github.com/edorguez/merki/pkg/utils"
)

type CartHandler struct {
	cartService services.CartService
}

func NewCartHandler(cartService services.CartService) *CartHandler {
	return &CartHandler{
		cartService: cartService,
	}
}

func (h *CartHandler) CreateCart(c *gin.Context) {
	var req dto.CreateCartRequest
	if !bindAndValidate(c, &req) {
		return
	}

	if req.SupermarketID == nil && req.NewSupermarket == nil {
		utils.ValidationError(c, map[string]string{"supermarketId": "supermarketId o newSupermarket es requerido"})
		return
	}

	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		utils.UnauthorizedResponse(c)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	var supermarketID uuid.UUID
	var customSupermarketName *string
	if req.SupermarketID != nil {
		supermarketID, err = uuid.Parse(*req.SupermarketID)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "ID de supermercado inválido")
			return
		}
	} else {
		supermarketID = uuid.Nil
		customSupermarketName = &req.NewSupermarket.Name
	}

	hasBudget := dto.ResolveHasBudget(req.HasBudget)

	cart := models.NewCart(userUUID, supermarketID, true, hasBudget, req.BudgetBs, req.BudgetUsd)

	result, err := h.cartService.CreateCart(c.Request.Context(), cart, customSupermarketName)
	if err != nil {
		h.handleError(c, err)
		return
	}

	resp := dto.CartResponse{
		ID:                result.ID.String(),
		SupermarketID:     result.SupermarketID.String(),
		UserID:            result.UserID.String(),
		IsActive:          result.IsActive,
		HasBudget:         result.HasBudget,
		BudgetBs:          result.BudgetBs,
		BudgetUsd:         result.BudgetUsd,
		TotalEstimatedBs:  result.TotalEstimatedBs,
		TotalEstimatedUsd: result.TotalEstimatedUsd,
	}
	utils.SuccessResponse(c, resp)
}

func (h *CartHandler) AddProduct(c *gin.Context) {
	var req dto.AddProductRequest
	if !bindAndValidate(c, &req) {
		return
	}

	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		utils.UnauthorizedResponse(c)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	cartID, err := uuid.Parse(req.CartID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de carrito inválido")
		return
	}

	supermarketID, err := uuid.Parse(req.SupermarketID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de supermercado inválido")
		return
	}

	product := models.NewProduct(
		supermarketID, userUUID,
		req.Name, req.Barcode, req.IsWeightBased,
		req.PriceUsd, req.PriceBs, req.PriceBcv,
		req.ImageUrl,
	)

	cartProduct, err := h.cartService.AddProduct(c.Request.Context(), userUUID, product, cartID, req.Quantity, req.IsManualEntry)
	if err != nil {
		h.handleError(c, err)
		return
	}

	resp := dto.CartProductResponse{
		ID:            cartProduct.ID.String(),
		CartID:        cartProduct.CartID.String(),
		ProductID:     cartProduct.ProductID.String(),
		Name:          product.Name,
		PriceBs:       product.PriceBolivares,
		PriceUsd:      product.PriceUsd,
		ImageUrl:      product.ImageUrl,
		Quantity:      cartProduct.Quantity,
		IsManualEntry: cartProduct.IsManualEntry,
		CreatedAt:     cartProduct.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     cartProduct.UpdatedAt.Format(time.RFC3339),
	}
	utils.SuccessResponse(c, resp)
}

func (h *CartHandler) UpdateCartProduct(c *gin.Context) {
	cartProductID, err := utils.ParseUUID(c.Param("cartProductId"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de producto en carrito inválido")
		return
	}

	var req dto.UpdateCartProductRequest
	if !bindAndValidate(c, &req) {
		return
	}

	cartID, err := uuid.Parse(req.CartID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de carrito inválido")
		return
	}

	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		utils.UnauthorizedResponse(c)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	product := &models.Product{
		Name:           req.Name,
		Barcode:        req.Barcode,
		IsWeightBased:  req.IsWeightBased,
		PriceUsd:       req.PriceUsd,
		PriceBolivares: req.PriceBs,
		PriceBcv:       req.PriceBcv,
		ImageUrl:       req.ImageUrl,
	}

	cartProduct, err := h.cartService.UpdateCartProduct(c.Request.Context(), userUUID, cartProductID, product, cartID, req.Quantity)
	if err != nil {
		h.handleError(c, err)
		return
	}

	resp := dto.CartProductResponse{
		ID:            cartProduct.ID.String(),
		CartID:        cartProduct.CartID.String(),
		ProductID:     cartProduct.ProductID.String(),
		Name:          req.Name,
		PriceBs:       req.PriceBs,
		PriceUsd:      req.PriceUsd,
		ImageUrl:      req.ImageUrl,
		Quantity:      cartProduct.Quantity,
		IsManualEntry: cartProduct.IsManualEntry,
		CreatedAt:     cartProduct.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     cartProduct.UpdatedAt.Format(time.RFC3339),
	}
	utils.SuccessResponse(c, resp)
}

func (h *CartHandler) UpdateProductQuantity(c *gin.Context) {
	var req dto.UpdateProductQuantityRequest
	if !bindAndValidate(c, &req) {
		return
	}

	cartProductID, err := uuid.Parse(req.CartProductID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de producto en carrito inválido")
		return
	}

	cartID, err := uuid.Parse(req.CartID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de carrito inválido")
		return
	}

	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		utils.UnauthorizedResponse(c)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	cartProduct := &models.CartProduct{
		CartID:   cartID,
		Quantity: req.Quantity,
	}
	cartProduct.ID = cartProductID

	result, err := h.cartService.UpdateProductQuantity(c.Request.Context(), userUUID, cartProduct)
	if err != nil {
		h.handleError(c, err)
		return
	}

	resp := dto.CartProductResponse{
		ID:            result.ID.String(),
		CartID:        result.CartID.String(),
		ProductID:     result.ProductID.String(),
		Quantity:      result.Quantity,
		IsManualEntry: result.IsManualEntry,
	}
	utils.SuccessResponse(c, resp)
}

func (h *CartHandler) RemoveProduct(c *gin.Context) {
	cartProductID, err := utils.ParseUUID(c.Param("cartProductId"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de producto en carrito inválido")
		return
	}

	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		utils.UnauthorizedResponse(c)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	if err := h.cartService.RemoveProduct(c.Request.Context(), userUUID, cartProductID); err != nil {
		h.handleError(c, err)
		return
	}

	utils.SuccessResponse(c, nil)
}

func (h *CartHandler) GetCarts(c *gin.Context) {
	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		utils.UnauthorizedResponse(c)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	limit := 0
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	carts, err := h.cartService.GetCartsByUser(c.Request.Context(), userUUID, limit)
	if err != nil {
		h.handleError(c, err)
		return
	}

	resp := make([]dto.CartResponse, len(carts))
	for i, cart := range carts {
		supermarketName := ""
		if cart.Supermarket != nil {
			supermarketName = cart.Supermarket.Name
		}

		resp[i] = dto.CartResponse{
			ID:                cart.ID.String(),
			SupermarketID:     cart.SupermarketID.String(),
			SupermarketName:   supermarketName,
			UserID:            cart.UserID.String(),
			IsActive:          cart.IsActive,
			HasBudget:         cart.HasBudget,
			BudgetBs:          cart.BudgetBs,
			BudgetUsd:         cart.BudgetUsd,
			TotalEstimatedBs:  cart.TotalEstimatedBs,
			TotalEstimatedUsd: cart.TotalEstimatedUsd,
			CreatedAt:         cart.CreatedAt.Format(time.RFC3339),
			UpdatedAt:         cart.UpdatedAt.Format(time.RFC3339),
		}
	}

	utils.SuccessResponse(c, resp)
}

func (h *CartHandler) GetCartDetail(c *gin.Context) {
	cartID, err := utils.ParseUUID(c.Param("cartId"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de carrito inválido")
		return
	}

	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		utils.UnauthorizedResponse(c)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	cart, products, err := h.cartService.GetCartDetail(c.Request.Context(), userUUID, cartID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	supermarketName := ""
	if cart.Supermarket != nil {
		supermarketName = cart.Supermarket.Name
	}

	productsResp := make([]dto.CartProductDetailResponse, len(products))
	for i, p := range products {
		productsResp[i] = dto.CartProductDetailResponse{
			ID:            p.ID.String(),
			CartID:        p.CartID.String(),
			ProductID:     p.ProductID.String(),
			Name:          p.Name,
			PriceBs:       p.PriceBolivares,
			PriceUsd:      p.PriceUsd,
			ImageUrl:      p.ImageUrl,
			Quantity:      p.Quantity,
			IsManualEntry: p.IsManualEntry,
			CreatedAt:     p.CreatedAt.Format(time.RFC3339),
			UpdatedAt:     p.UpdatedAt.Format(time.RFC3339),
		}
	}

	resp := dto.CartDetailResponse{
		ID:                cart.ID.String(),
		SupermarketID:     cart.SupermarketID.String(),
		SupermarketName:   supermarketName,
		UserID:            cart.UserID.String(),
		IsActive:          cart.IsActive,
		HasBudget:         cart.HasBudget,
		BudgetBs:          cart.BudgetBs,
		BudgetUsd:         cart.BudgetUsd,
		TotalEstimatedBs:  cart.TotalEstimatedBs,
		TotalEstimatedUsd: cart.TotalEstimatedUsd,
		CreatedAt:         cart.CreatedAt.Format(time.RFC3339),
		UpdatedAt:         cart.UpdatedAt.Format(time.RFC3339),
		Products:          productsResp,
	}

	utils.SuccessResponse(c, resp)
}

func (h *CartHandler) CheckoutCart(c *gin.Context) {
	cartID, err := utils.ParseUUID(c.Param("cartId"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de carrito inválido")
		return
	}

	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		utils.UnauthorizedResponse(c)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	cart, err := h.cartService.CheckoutCart(c.Request.Context(), userUUID, cartID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	resp := dto.CartResponse{
		ID:                cart.ID.String(),
		SupermarketID:     cart.SupermarketID.String(),
		UserID:            cart.UserID.String(),
		IsActive:          cart.IsActive,
		HasBudget:         cart.HasBudget,
		BudgetBs:          cart.BudgetBs,
		BudgetUsd:         cart.BudgetUsd,
		TotalEstimatedBs:  cart.TotalEstimatedBs,
		TotalEstimatedUsd: cart.TotalEstimatedUsd,
	}
	utils.SuccessResponse(c, resp)
}

func (h *CartHandler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, apperrors.ErrConflict):
		utils.ErrorResponse(c, http.StatusConflict, "conflicto en el carrito")
	case errors.Is(err, apperrors.ErrNotFound):
		utils.NotFoundResponse(c, "recurso")
	case errors.Is(err, apperrors.ErrInvalidInput):
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
	case errors.Is(err, apperrors.ErrForbidden):
		utils.ForbiddenResponse(c)
	default:
		utils.InternalErrorResponse(c)
	}
}
