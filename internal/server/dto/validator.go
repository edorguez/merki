package dto

import (
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()

	validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	// A cart created "con presupuesto" (hasBudget true, or omitted) must
	// include both budget amounts. When hasBudget is absent we default to true
	// to preserve the legacy behavior where every cart had a budget.
	validate.RegisterStructValidation(validateCartBudget, CreateCartRequest{})
}

// validateCartBudget enforces that budget amounts are required when a cart is
// created with a budget.
func validateCartBudget(sl validator.StructLevel) {
	req := sl.Current().Interface().(CreateCartRequest)
	hasBudget := ResolveHasBudget(req.HasBudget)
	if hasBudget {
		if req.BudgetBs == nil {
			sl.ReportError(req.BudgetBs, "budgetBs", "BudgetBs", "required_if", "hasBudget true")
		}
		if req.BudgetUsd == nil {
			sl.ReportError(req.BudgetUsd, "budgetUsd", "BudgetUsd", "required_if", "hasBudget true")
		}
	}
}

func ValidateRequest(req any) map[string]string {
	err := validate.Struct(req)
	if err == nil {
		return nil
	}

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		errorsMap := make(map[string]string)
		for _, fe := range validationErrors {
			errorsMap[fe.Field()] = translateTag(fe)
		}
		return errorsMap
	}

	return map[string]string{"_error": "error de validación"}
}

func translateTag(fe validator.FieldError) string {
	field := fe.Field()
	tag := fe.Tag()
	param := fe.Param()

	switch tag {
	case "required":
		return "el campo " + field + " es obligatorio"
	case "email":
		return "el campo " + field + " no tiene un formato de correo electrónico válido"
	case "min":
		if fe.Type().Kind() == reflect.String {
			return "el campo " + field + " debe tener al menos " + param + " caracteres"
		}
		return "el campo " + field + " debe ser mayor o igual a " + param
	case "max":
		return "el campo " + field + " no puede exceder " + param + " caracteres"
	case "oneof":
		return "el campo " + field + " debe ser uno de los siguientes valores: " + param
	case "uuid":
		return "el campo " + field + " no es un UUID válido"
	case "required_if":
		return "el campo " + field + " es obligatorio cuando el carrito tiene presupuesto"
	case "gte":
		return "el campo " + field + " debe ser mayor o igual a " + param
	case "lte":
		return "el campo " + field + " debe ser menor o igual a " + param
	default:
		return "el campo " + field + " no es válido"
	}
}
