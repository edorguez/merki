package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/edorguez/merki/internal/server/dto"
	"github.com/edorguez/merki/internal/server/middleware"
	"github.com/edorguez/merki/internal/server/models"
	"github.com/edorguez/merki/internal/server/services"
	"github.com/edorguez/merki/pkg/constants"
	apperrors "github.com/edorguez/merki/pkg/core/errors"
	"github.com/edorguez/merki/pkg/utils"
)

type AuthHandler struct {
	authService services.AuthService
	syncService services.SyncService
}

func NewAuthHandler(authService services.AuthService, syncService services.SyncService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		syncService: syncService,
	}
}

func (h *AuthHandler) SyncUser(c *gin.Context) {
	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		utils.UnauthorizedResponse(c)
		return
	}

	var req dto.SyncUserRequest
	if !bindAndValidate(c, &req) {
		return
	}

	user, err := h.authService.GetOrCreateUser(
		c.Request.Context(),
		userID,
		req.Email,
		req.Name,
		req.AuthProvider,
		req.IsAnonymous,
	)
	if err != nil {
		h.handleError(c, err)
		return
	}

	var premiumUntil string
	if user.PremiumUntil != nil {
		premiumUntil = user.PremiumUntil.Format(time.RFC3339)
	}

	resp := dto.SyncUserResponse{
		ID:               user.ID.String(),
		BetterAuthUserID: user.BetterAuthUserID,
		Email:            user.Email,
		Name:             user.Name,
		AuthProvider:     user.AuthProvider,
		IsPremium:        user.IsActivePremium(),
		IsAnonymous:      user.IsAnonymous,
		PremiumUntil:     premiumUntil,
		CreatedAt:        user.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        user.UpdatedAt.Format(time.RFC3339),
	}
	utils.SuccessResponse(c, resp)
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		utils.UnauthorizedResponse(c)
		return
	}

	userAny, exists := c.Get(constants.CtxUserKey)
	if !exists {
		utils.SuccessResponse(c, dto.GetMeResponse{UserID: userID})
		return
	}

	user, ok := userAny.(*models.User)
	if !ok {
		utils.SuccessResponse(c, dto.GetMeResponse{UserID: userID})
		return
	}

	var premiumUntil *string
	if user.PremiumUntil != nil {
		formatted := user.PremiumUntil.Format(time.RFC3339)
		premiumUntil = &formatted
	}

	utils.SuccessResponse(c, dto.GetMeResponse{
		UserID:       userID,
		Name:         user.Name,
		IsPremium:    user.IsActivePremium(),
		IsAnonymous:  user.IsAnonymous,
		PremiumUntil: premiumUntil,
	})
}

func (h *AuthHandler) RequestPasswordReset(c *gin.Context) {
	var req dto.ForgotPasswordRequest
	if !bindAndValidate(c, &req) {
		return
	}

	if err := h.authService.SendPasswordResetEmail(c.Request.Context(), req.Email, req.Name, req.ResetURL); err != nil {
		utils.InternalErrorResponse(c)
		return
	}

	utils.SuccessResponse(c, gin.H{"message": "email de restablecimiento enviado"})
}

func (h *AuthHandler) DeleteAccount(c *gin.Context) {
	userAny, exists := c.Get(constants.CtxUserKey)
	if !exists {
		utils.UnauthorizedResponse(c)
		return
	}
	user, ok := userAny.(*models.User)
	if !ok {
		utils.UnauthorizedResponse(c)
		return
	}

	authHeader := c.GetHeader("Authorization")
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		utils.UnauthorizedResponse(c)
		return
	}

	if err := h.authService.DeleteAccount(c.Request.Context(), user, parts[1]); err != nil {
		h.handleError(c, err)
		return
	}

	utils.SuccessResponse(c, gin.H{"message": "cuenta eliminada"})
}

func (h *AuthHandler) MigrateUserData(c *gin.Context) {
	userAny, exists := c.Get(constants.CtxUserKey)
	if !exists {
		utils.UnauthorizedResponse(c)
		return
	}
	user, ok := userAny.(*models.User)
	if !ok {
		utils.UnauthorizedResponse(c)
		return
	}

	var req dto.MigrateUserDataRequest
	if !bindAndValidate(c, &req) {
		return
	}

	if user.BetterAuthUserID != req.FromBetterAuthUserId {
		utils.UnauthorizedResponse(c)
		return
	}

	if err := h.authService.MigrateUserData(c.Request.Context(), req.FromBetterAuthUserId, req.ToBetterAuthUserId, req.Email, req.Name, req.AuthProvider); err != nil {
		h.handleError(c, err)
		return
	}

	if len(req.Operations) > 0 {
		userID, ok := middleware.GetUserIDFromContext(c)
		if ok {
			parsedUserID, parseErr := uuid.Parse(userID)
			if parseErr == nil {
				_, _ = h.syncService.MigrateUserData(c.Request.Context(), parsedUserID, parsedUserID, req.Operations)
			}
		}
	}

	utils.SuccessResponse(c, gin.H{"message": "data migrated successfully"})
}

func (h *AuthHandler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, apperrors.ErrConflict):
		utils.ErrorResponse(c, http.StatusConflict, "el usuario ya existe")
	case errors.Is(err, apperrors.ErrUnauthorized):
		utils.UnauthorizedResponse(c)
	case errors.Is(err, apperrors.ErrNotFound):
		utils.NotFoundResponse(c, "usuario")
	default:
		utils.InternalErrorResponse(c)
	}
}
