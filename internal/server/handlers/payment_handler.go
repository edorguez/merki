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

type PaymentHandler struct {
	paymentService services.PaymentService
}

func NewPaymentHandler(paymentService services.PaymentService) *PaymentHandler {
	return &PaymentHandler{paymentService: paymentService}
}

func (h *PaymentHandler) CreatePayment(c *gin.Context) {
	var req dto.CreatePaymentRequest
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
	paidAt, err := time.Parse(time.RFC3339, req.PaidAt)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "paidAt debe tener formato ISO 8601 (RFC3339)")
		return
	}
	payment := models.NewPayment(
		userUUID, req.NumberOfMonths, req.ReferenceNumber, req.BankName,
		req.AmountBs, req.AmountUsd, req.PriceBcv, req.Identification,
		req.IsDiscount, paidAt,
	)
	result, err := h.paymentService.CreatePayment(c.Request.Context(), payment)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponse(c, toPaymentResponse(result))
}

func (h *PaymentHandler) GetPaymentByID(c *gin.Context) {
	paymentID, err := utils.ParseUUID(c.Param("paymentId"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de pago inválido")
		return
	}
	payment, err := h.paymentService.FindByID(c.Request.Context(), paymentID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponse(c, toPaymentResponse(payment))
}

func (h *PaymentHandler) GetAllPayments(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	sortBy := c.DefaultQuery("sortBy", "createdAt")
	sortDir := c.DefaultQuery("sortDir", "desc")

	payments, total, err := h.paymentService.FindAllPaginated(c.Request.Context(), page, pageSize, sortBy, sortDir)
	if err != nil {
		h.handleError(c, err)
		return
	}
	resp := make([]dto.PaymentResponse, len(payments))
	for i, p := range payments {
		resp[i] = toPaymentResponse(p)
	}
	utils.SuccessResponse(c, dto.PaginatedResponse[dto.PaymentResponse]{
		Items:    resp,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

func (h *PaymentHandler) GetPaymentsByUserID(c *gin.Context) {
	userID, err := utils.ParseUUID(c.Param("userId"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	if !h.isAdminOrOwner(c, userID) {
		utils.ForbiddenResponse(c)
		return
	}

	statusIDStr := c.Query("statusId")
	if statusIDStr != "" {
		statusUUID, err := uuid.Parse(statusIDStr)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "statusId inválido")
			return
		}
		payments, err := h.paymentService.FindByUserIDAndStatus(c.Request.Context(), userID, statusUUID)
		if err != nil {
			h.handleError(c, err)
			return
		}
		resp := make([]dto.PaymentResponse, len(payments))
		for i, p := range payments {
			resp[i] = toPaymentResponse(p)
		}
		utils.SuccessResponse(c, resp)
		return
	}

	payments, err := h.paymentService.FindByUserID(c.Request.Context(), userID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	resp := make([]dto.PaymentResponse, len(payments))
	for i, p := range payments {
		resp[i] = toPaymentResponse(p)
	}
	utils.SuccessResponse(c, resp)
}

func (h *PaymentHandler) GetPaymentsByEmail(c *gin.Context) {
	email := c.Param("email")
	if email == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "email es requerido")
		return
	}
	payments, err := h.paymentService.FindByEmail(c.Request.Context(), email)
	if err != nil {
		h.handleError(c, err)
		return
	}
	resp := make([]dto.PaymentResponse, len(payments))
	for i, p := range payments {
		resp[i] = toPaymentResponse(p)
	}
	utils.SuccessResponse(c, resp)
}

func (h *PaymentHandler) UpdatePayment(c *gin.Context) {
	paymentID, err := utils.ParseUUID(c.Param("paymentId"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de pago inválido")
		return
	}
	var req dto.UpdatePaymentRequest
	if !bindAndValidate(c, &req) {
		return
	}
	result, err := h.paymentService.UpdatePayment(c.Request.Context(), paymentID, req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponse(c, toPaymentResponse(result))
}

func (h *PaymentHandler) DeletePayment(c *gin.Context) {
	paymentID, err := utils.ParseUUID(c.Param("paymentId"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de pago inválido")
		return
	}
	if err := h.paymentService.DeletePayment(c.Request.Context(), paymentID); err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponse(c, nil)
}

func (h *PaymentHandler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, apperrors.ErrNotFound):
		utils.NotFoundResponse(c, "pago")
	default:
		utils.InternalErrorResponse(c)
	}
}

// isAdminOrOwner allows admins/staff to query any user's payments, and regular
// users to query only their own payment records.
func (h *PaymentHandler) isAdminOrOwner(c *gin.Context, targetUserID uuid.UUID) bool {
	if role, exists := middleware.GetUserRoleFromContext(c); exists && (role == "admin" || role == "staff") {
		return true
	}
	authUserID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		return false
	}
	return authUserID == targetUserID.String()
}

func toPaymentResponse(p *models.Payment) dto.PaymentResponse {
	var deletedAt *string
	if p.DeletedAt.Valid {
		formatted := p.DeletedAt.Time.Format(time.RFC3339)
		deletedAt = &formatted
	}
	var premiumUntil *string
	if p.User.PremiumUntil != nil {
		formatted := p.User.PremiumUntil.Format(time.RFC3339)
		premiumUntil = &formatted
	}
	var approvedAt *string
	if p.ApprovedAt != nil {
		formatted := p.ApprovedAt.Format(time.RFC3339)
		approvedAt = &formatted
	}
	var rejectedAt *string
	if p.RejectedAt != nil {
		formatted := p.RejectedAt.Format(time.RFC3339)
		rejectedAt = &formatted
	}
	var rejectionReasonID *string
	if p.RejectionReasonID != nil {
		formatted := p.RejectionReasonID.String()
		rejectionReasonID = &formatted
	}

	paymentStatus := &dto.PaymentStatusResponse{
		ID:          p.PaymentStatus.ID.String(),
		Name:        p.PaymentStatus.Name,
		Description: p.PaymentStatus.Description,
	}

	var rejectionReason *dto.RejectionReasonResponse
	if p.RejectionReason != nil {
		rejectionReason = &dto.RejectionReasonResponse{
			ID:     p.RejectionReason.ID.String(),
			Reason: p.RejectionReason.Reason,
		}
	}

	return dto.PaymentResponse{
		ID:                p.ID.String(),
		UserID:            p.UserID.String(),
		NumberOfMonths:    p.NumberOfMonths,
		ReferenceNumber:   p.ReferenceNumber,
		BankName:          p.BankName,
		AmountBs:          p.AmountBs,
		AmountUsd:         p.AmountUsd,
		PriceBcv:          p.PriceBcv,
		Identification:    p.Identification,
		IsDiscount:        p.IsDiscount,
		PaidAt:            p.PaidAt.Format(time.RFC3339),
		StatusID:          p.StatusID.String(),
		RejectionReasonID: rejectionReasonID,
		RejectionMessage:  p.RejectionMessage,
		ApprovedAt:        approvedAt,
		RejectedAt:        rejectedAt,
		CreatedAt:         p.CreatedAt.Format(time.RFC3339),
		UpdatedAt:         p.UpdatedAt.Format(time.RFC3339),
		DeletedAt:         deletedAt,
		User: dto.PaymentUserResponse{
			ID:           p.User.ID.String(),
			Email:        p.User.Email,
			AuthProvider: p.User.AuthProvider,
			IsPremium:    p.User.IsPremium,
			IsAnonymous:  p.User.IsAnonymous,
			PremiumUntil: premiumUntil,
		},
		PaymentStatus:   paymentStatus,
		RejectionReason: rejectionReason,
	}
}
