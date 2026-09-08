package handlers

import (
	"github.com/gin-gonic/gin"

	"github.com/edorguez/merki/internal/server/dto"
	"github.com/edorguez/merki/pkg/utils"
)

// bindAndValidate binds the request JSON body into req and runs the DTO
// validation tags defined on it. If binding or validation fails it writes the
// error response and returns false so the caller can stop.
func bindAndValidate(c *gin.Context, req any) bool {
	if err := c.ShouldBindJSON(req); err != nil {
		utils.ValidationError(c, map[string]string{"_error": "cuerpo de la solicitud inválido"})
		return false
	}
	if errs := dto.ValidateRequest(req); len(errs) > 0 {
		utils.ValidationError(c, errs)
		return false
	}
	return true
}
