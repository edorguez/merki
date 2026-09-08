package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/edorguez/merki/internal/server/dto"
	"github.com/edorguez/merki/internal/server/middleware"
	"github.com/edorguez/merki/internal/server/services"
	apperrors "github.com/edorguez/merki/pkg/core/errors"
	"github.com/edorguez/merki/pkg/logger"
	"github.com/edorguez/merki/pkg/utils"
)

type SyncHandler struct {
	syncService services.SyncService
	log         *logger.Logger
}

func NewSyncHandler(syncService services.SyncService, log *logger.Logger) *SyncHandler {
	return &SyncHandler{
		syncService: syncService,
		log:         log,
	}
}

func (h *SyncHandler) ProcessSync(c *gin.Context) {
	var req dto.SyncRequest
	if !bindAndValidate(c, &req) {
		return
	}

	userIDStr, ok := middleware.GetUserIDFromContext(c)
	if !ok {
		utils.UnauthorizedResponse(c)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	h.log.Info("sync request received", zap.Int("operations", len(req.Operations)))

	resp, err := h.syncService.ProcessSync(c.Request.Context(), userID, req.Operations)
	if err != nil {
		h.handleError(c, err)
		return
	}

	for i, r := range resp.Results {
		table := ""
		action := ""
		if i < len(req.Operations) {
			table = string(req.Operations[i].Table)
			action = string(req.Operations[i].Action)
		}
		h.log.Info("sync op result",
			zap.String("table", table),
			zap.String("action", action),
			zap.String("localId", r.LocalID),
			zap.Bool("success", r.Success),
			zap.String("error", r.Error),
		)
	}

	utils.SuccessResponse(c, resp)
}

func (h *SyncHandler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, apperrors.ErrNotFound):
		utils.NotFoundResponse(c, "usuario")
	default:
		utils.InternalErrorResponse(c)
	}
}
