package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/edorguez/merki/internal/server/dto"
	"github.com/edorguez/merki/internal/server/models"
	"github.com/edorguez/merki/internal/server/repository"
	apperrors "github.com/edorguez/merki/pkg/core/errors"
)

// SyncService defines offline synchronization operations
type SyncService interface {
	ProcessSync(ctx context.Context, userID uuid.UUID, operations []dto.SyncOperation) (*dto.SyncResponse, error)
	MigrateUserData(ctx context.Context, anonymousUserID uuid.UUID, newUserID uuid.UUID, operations []dto.SyncOperation) (*dto.SyncResponse, error)
}

type syncService struct {
	userRepo        repository.UserRepository
	cartRepo        repository.CartRepository
	cartProductRepo repository.CartProductRepository
	productRepo     repository.ProductRepository
	supermarketRepo repository.SupermarketRepository
}

func NewSyncService(
	userRepo repository.UserRepository,
	cartRepo repository.CartRepository,
	cartProductRepo repository.CartProductRepository,
	productRepo repository.ProductRepository,
	supermarketRepo repository.SupermarketRepository,
) SyncService {
	return &syncService{
		userRepo:        userRepo,
		cartRepo:        cartRepo,
		cartProductRepo: cartProductRepo,
		productRepo:     productRepo,
		supermarketRepo: supermarketRepo,
	}
}

// ProcessSync processes a batch of sync operations from a mobile client
func (s *syncService) ProcessSync(ctx context.Context, userID uuid.UUID, operations []dto.SyncOperation) (*dto.SyncResponse, error) {
	results := make([]dto.SyncResult, len(operations))

	for i, op := range operations {
		result := dto.SyncResult{
			LocalID: op.LocalID,
			Success: false,
		}

		var err error
		var serverVersion map[string]any

		switch op.Table {
		case dto.SyncTableUsers:
			result.Success, result.Error = s.processUserOperation(ctx, userID, op)
		case dto.SyncTableSupermarkets:
			serverVersion, err = s.processSupermarketOperation(ctx, userID, op)
		case dto.SyncTableProducts:
			serverVersion, err = s.processProductOperation(ctx, userID, op)
		case dto.SyncTableCarts:
			serverVersion, err = s.processCartOperation(ctx, userID, op)
		case dto.SyncTableCartProducts:
			serverVersion, err = s.processCartProductOperation(ctx, userID, op)
		default:
			result.Error = "tabla desconocida"
			results[i] = result
			continue
		}

		if err != nil {
			result.Error = err.Error()
		} else if op.Table != dto.SyncTableUsers {
			result.Success = true
			if serverVersion != nil {
				result.ServerVersion = serverVersion
			}
		}

		results[i] = result
	}

	return &dto.SyncResponse{Results: results}, nil
}

func (s *syncService) MigrateUserData(
	ctx context.Context,
	anonymousUserID uuid.UUID,
	newUserID uuid.UUID,
	operations []dto.SyncOperation,
) (*dto.SyncResponse, error) {
	newUserIDStr := newUserID.String()
	for i := range operations {
		if _, ok := operations[i].Payload["userId"]; ok {
			operations[i].Payload["userId"] = newUserIDStr
		}
		if _, ok := operations[i].Payload["user_id"]; ok {
			operations[i].Payload["user_id"] = newUserIDStr
		}
	}

	return s.ProcessSync(ctx, newUserID, operations)
}

func (s *syncService) processSupermarketOperation(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (map[string]any, error) {
	switch op.Action {
	case dto.SyncOpInsert:
		return s.handleSupermarketInsert(ctx, userID, op)
	case dto.SyncOpUpdate:
		return s.handleSupermarketUpdate(ctx, userID, op)
	case dto.SyncOpDelete:
		return nil, s.handleSupermarketDelete(ctx, userID, op)
	default:
		return nil, fmt.Errorf("acción desconocida para supermercados: %s", op.Action)
	}
}

func (s *syncService) handleSupermarketInsert(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (map[string]any, error) {
	name, ok := op.Payload["name"].(string)
	if !ok || name == "" {
		return nil, fmt.Errorf("nombre de supermercado requerido")
	}

	isCustom := false
	if v, ok := op.Payload["isCustom"].(bool); ok {
		isCustom = v
	}

	supermarket := models.NewSupermarket(name, isCustom, nil, userID)
	supermarket.ID = uuid.New()

	if err := s.supermarketRepo.Create(ctx, supermarket); err != nil {
		return nil, fmt.Errorf("error al crear supermercado: %w", err)
	}

	return map[string]any{
		"id": supermarket.ID.String(),
	}, nil
}

func (s *syncService) handleSupermarketUpdate(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (map[string]any, error) {
	idStr, ok := op.Payload["id"].(string)
	if !ok {
		return nil, fmt.Errorf("ID de supermercado requerido")
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, fmt.Errorf("ID de supermercado inválido")
	}

	existing, err := s.supermarketRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("supermercado no encontrado: %w", err)
	}

	if existing.UserID != userID {
		return nil, fmt.Errorf("no autorizado para modificar este supermercado")
	}

	if name, ok := op.Payload["name"].(string); ok && name != "" {
		existing.Name = name
	}

	if err := s.supermarketRepo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("error al actualizar supermercado: %w", err)
	}

	return nil, nil
}

func (s *syncService) handleSupermarketDelete(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) error {
	idStr, ok := op.Payload["id"].(string)
	if !ok {
		return fmt.Errorf("ID de supermercado requerido")
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return fmt.Errorf("ID de supermercado inválido")
	}

	return s.supermarketRepo.Delete(ctx, id)
}

func (s *syncService) processProductOperation(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (map[string]any, error) {
	switch op.Action {
	case dto.SyncOpInsert:
		return s.handleProductInsert(ctx, userID, op)
	case dto.SyncOpUpdate:
		return s.handleProductUpdate(ctx, userID, op)
	case dto.SyncOpDelete:
		return nil, s.handleProductDelete(ctx, userID, op)
	default:
		return nil, fmt.Errorf("acción desconocida para productos: %s", op.Action)
	}
}

func (s *syncService) handleProductInsert(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (map[string]any, error) {
	name, ok := op.Payload["name"].(string)
	if !ok || name == "" {
		return nil, fmt.Errorf("nombre de producto requerido")
	}

	supermarketIDStr, ok := op.Payload["supermarketId"].(string)
	if !ok {
		return nil, fmt.Errorf("ID de supermercado requerido")
	}

	supermarketID, err := uuid.Parse(supermarketIDStr)
	if err != nil {
		return nil, fmt.Errorf("ID de supermercado inválido")
	}

	product := models.NewProduct(
		supermarketID,
		userID,
		name,
		nil,
		false,
		0,
		0,
		0,
		nil,
	)
	product.ID = uuid.New()

	if barcode, ok := op.Payload["barcode"].(string); ok {
		product.Barcode = &barcode
	}
	if isWeightBased, ok := op.Payload["isWeightBased"].(bool); ok {
		product.IsWeightBased = isWeightBased
	}
	if priceUsd, ok := op.Payload["priceUsd"].(float64); ok {
		product.PriceUsd = int64(priceUsd)
	}
	if priceBs, ok := op.Payload["priceBs"].(float64); ok {
		product.PriceBolivares = int64(priceBs)
	}
	if priceBcv, ok := op.Payload["priceBcv"].(float64); ok {
		product.PriceBcv = int64(priceBcv)
	}

	if err := s.productRepo.Create(ctx, product); err != nil {
		return nil, fmt.Errorf("error al crear producto: %w", err)
	}

	return map[string]any{
		"id": product.ID.String(),
	}, nil
}

func (s *syncService) handleProductUpdate(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (map[string]any, error) {
	idStr, ok := op.Payload["id"].(string)
	if !ok {
		return nil, fmt.Errorf("ID de producto requerido")
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, fmt.Errorf("ID de producto inválido")
	}

	existing, err := s.productRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("producto no encontrado: %w", err)
	}

	if existing.UserID != userID {
		return nil, fmt.Errorf("no autorizado para modificar este producto")
	}

	if name, ok := op.Payload["name"].(string); ok && name != "" {
		existing.Name = name
	}
	if priceUsd, ok := op.Payload["priceUsd"].(float64); ok {
		existing.PriceUsd = int64(priceUsd)
	}
	if priceBs, ok := op.Payload["priceBs"].(float64); ok {
		existing.PriceBolivares = int64(priceBs)
	}

	if err := s.productRepo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("error al actualizar producto: %w", err)
	}

	return nil, nil
}

func (s *syncService) handleProductDelete(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) error {
	idStr, ok := op.Payload["id"].(string)
	if !ok {
		return fmt.Errorf("ID de producto requerido")
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return fmt.Errorf("ID de producto inválido")
	}

	return s.productRepo.Delete(ctx, id)
}

func (s *syncService) processCartOperation(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (map[string]any, error) {
	switch op.Action {
	case dto.SyncOpInsert:
		return s.handleCartInsert(ctx, userID, op)
	case dto.SyncOpUpdate:
		return s.handleCartUpdate(ctx, userID, op)
	case dto.SyncOpDelete:
		return nil, s.handleCartDelete(ctx, userID, op)
	default:
		return nil, fmt.Errorf("acción desconocida para carritos: %s", op.Action)
	}
}

func (s *syncService) handleCartInsert(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (map[string]any, error) {
	// Idempotency: if a cart with this client-side local id already exists for
	// the user, return it instead of inserting a duplicate (sync ops can be
	// re-sent when a response is lost).
	if op.LocalID != "" {
		if existing, err := s.cartRepo.FindByLocalID(ctx, userID, op.LocalID); err == nil {
			return map[string]any{
				"id":              existing.ID.String(),
				"supermarketId":   existing.SupermarketID.String(),
				"supermarketName": "",
			}, nil
		}
	}

	supermarketID, err := s.resolveSupermarketID(ctx, userID, op)
	if err != nil {
		return nil, err
	}

	hasBudget := true
	if v, ok := op.Payload["hasBudget"].(bool); ok {
		hasBudget = v
	}

	var budgetBs, budgetUsd *int64
	if v, ok := op.Payload["budgetBs"].(float64); ok {
		bs := int64(v)
		budgetBs = &bs
	}
	if v, ok := op.Payload["budgetUsd"].(float64); ok {
		usd := int64(v)
		budgetUsd = &usd
	}

	if dto.MissingBudgetAmounts(hasBudget, budgetBs, budgetUsd) {
		return nil, fmt.Errorf("budgetBs y budgetUsd son obligatorios cuando el carrito tiene presupuesto")
	}
	if !hasBudget {
		budgetBs = nil
		budgetUsd = nil
	}

	cart := models.NewCart(userID, supermarketID, true, hasBudget, budgetBs, budgetUsd)
	cart.ID = uuid.New()
	cart.LocalID = op.LocalID

	if err := s.cartRepo.Create(ctx, cart); err != nil {
		return nil, fmt.Errorf("error al crear carrito: %w", err)
	}

	return map[string]any{
		"id":              cart.ID.String(),
		"supermarketId":   supermarketID.String(),
		"supermarketName": "",
	}, nil
}

// resolveSupermarketID resolves the supermarket referenced by a sync operation.
// Missing, invalid (e.g. client-side "local_..." ids), or unknown references
// fall back to creating a custom supermarket so a cart sync never fails.
func (s *syncService) resolveSupermarketID(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (uuid.UUID, error) {
	if supermarketIDStr, ok := op.Payload["supermarketId"].(string); ok && supermarketIDStr != "" {
		if id, err := uuid.Parse(supermarketIDStr); err == nil {
			if _, findErr := s.supermarketRepo.FindByID(ctx, id); findErr == nil {
				return id, nil
			}
		}
	}

	name := "Supermercado"
	if newSupermarket, ok := op.Payload["newSupermarket"].(map[string]any); ok {
		if n, ok := newSupermarket["name"].(string); ok && n != "" {
			name = n
		}
	}

	id := uuid.New()
	customSupermarket := models.NewSupermarket(name, true, nil, userID)
	customSupermarket.ID = id
	if err := s.supermarketRepo.Create(ctx, customSupermarket); err != nil {
		return uuid.Nil, fmt.Errorf("error al crear supermercado: %w", err)
	}

	return id, nil
}

func (s *syncService) handleCartUpdate(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (map[string]any, error) {
	idStr, ok := op.Payload["id"].(string)
	if !ok {
		return nil, fmt.Errorf("ID de carrito requerido")
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, fmt.Errorf("ID de carrito inválido")
	}

	if checkout, ok := op.Payload["checkout"].(bool); ok && checkout {
		cart, err := s.cartRepo.FindByID(ctx, id)
		if err != nil {
			if errors.Is(err, apperrors.ErrNotFound) {
				return nil, fmt.Errorf("carrito no encontrado")
			}
			return nil, fmt.Errorf("error al buscar carrito: %w", err)
		}

		if cart.UserID != userID {
			return nil, fmt.Errorf("no autorizado")
		}

		cart.IsActive = false
		now := time.Now()
		cart.UpdatedAt = now

		if err := s.cartRepo.Update(ctx, cart); err != nil {
			return nil, fmt.Errorf("error al completar carrito: %w", err)
		}
		return nil, nil
	}

	existing, err := s.cartRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, apperrors.ErrNotFound) {
			return nil, fmt.Errorf("carrito no encontrado")
		}
		return nil, fmt.Errorf("error al buscar carrito: %w", err)
	}

	if existing.UserID != userID {
		return nil, fmt.Errorf("no autorizado para modificar este carrito")
	}

	if isActive, ok := op.Payload["isActive"].(bool); ok {
		existing.IsActive = isActive
	}

	if hasBudget, ok := op.Payload["hasBudget"].(bool); ok {
		existing.HasBudget = hasBudget
		if !hasBudget {
			existing.BudgetBs = nil
			existing.BudgetUsd = nil
		}
	}
	if v, ok := op.Payload["budgetBs"].(float64); ok {
		bs := int64(v)
		existing.BudgetBs = &bs
	}
	if v, ok := op.Payload["budgetUsd"].(float64); ok {
		usd := int64(v)
		existing.BudgetUsd = &usd
	}

	if dto.MissingBudgetAmounts(existing.HasBudget, existing.BudgetBs, existing.BudgetUsd) {
		return nil, fmt.Errorf("budgetBs y budgetUsd son obligatorios cuando el carrito tiene presupuesto")
	}

	if err := s.cartRepo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("error al actualizar carrito: %w", err)
	}

	return nil, nil
}

func (s *syncService) handleCartDelete(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) error {
	idStr, ok := op.Payload["id"].(string)
	if !ok {
		return fmt.Errorf("ID de carrito requerido")
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return fmt.Errorf("ID de carrito inválido")
	}

	return s.cartRepo.Delete(ctx, id)
}

func (s *syncService) processCartProductOperation(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (map[string]any, error) {
	switch op.Action {
	case dto.SyncOpInsert:
		return s.handleCartProductInsert(ctx, userID, op)
	case dto.SyncOpUpdate:
		return s.handleCartProductUpdate(ctx, userID, op)
	case dto.SyncOpDelete:
		return nil, s.handleCartProductDelete(ctx, userID, op)
	default:
		return nil, fmt.Errorf("acción desconocida para productos de carrito: %s", op.Action)
	}
}

func (s *syncService) handleCartProductInsert(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (map[string]any, error) {
	cartIDStr, ok := op.Payload["cartId"].(string)
	if !ok || cartIDStr == "" {
		return nil, fmt.Errorf("ID de carrito requerido")
	}

	cartID, err := uuid.Parse(cartIDStr)
	if err != nil {
		// The client may still reference a cart by its local id (e.g. "local_...").
		// Resolve it to the server cart before it was synced.
		resolved, findErr := s.cartRepo.FindByLocalID(ctx, userID, cartIDStr)
		if findErr != nil {
			return nil, fmt.Errorf("ID de carrito inválido")
		}
		cartID = resolved.ID
	}

	name, ok := op.Payload["name"].(string)
	if !ok || name == "" {
		return nil, fmt.Errorf("nombre de producto requerido")
	}

	supermarketIDStr, ok := op.Payload["supermarketId"].(string)
	if !ok {
		return nil, fmt.Errorf("ID de supermercado requerido")
	}

	supermarketID, err := uuid.Parse(supermarketIDStr)
	if err != nil {
		return nil, fmt.Errorf("ID de supermercado inválido")
	}

	priceUsd := int64(0)
	priceBs := int64(0)
	priceBcv := int64(0)

	if v, ok := op.Payload["priceUsd"].(float64); ok {
		priceUsd = int64(v)
	}
	if v, ok := op.Payload["priceBs"].(float64); ok {
		priceBs = int64(v)
	}
	if v, ok := op.Payload["priceBcv"].(float64); ok {
		priceBcv = int64(v)
	}

	product := models.NewProduct(
		supermarketID,
		userID,
		name,
		nil,
		false,
		priceUsd,
		priceBs,
		priceBcv,
		nil,
	)
	product.ID = uuid.New()

	if barcode, ok := op.Payload["barcode"].(string); ok && barcode != "" {
		product.Barcode = &barcode
	}
	if isWeightBased, ok := op.Payload["isWeightBased"].(bool); ok {
		product.IsWeightBased = isWeightBased
	}
	if imageUrl, ok := op.Payload["imageUrl"].(string); ok && imageUrl != "" {
		url := imageUrl
		product.ImageUrl = &url
	}

	if err := s.productRepo.Create(ctx, product); err != nil {
		return nil, fmt.Errorf("error al crear producto: %w", err)
	}

	isManualEntry := true
	if v, ok := op.Payload["isManualEntry"].(bool); ok {
		isManualEntry = v
	}

	cartProduct := models.NewCartProduct(cartID, product.ID, 1, isManualEntry)
	cartProduct.ID = uuid.New()
	cartProduct.LocalID = op.LocalID

	if qty, ok := op.Payload["quantity"].(float64); ok {
		cartProduct.Quantity = int(qty)
	}

	if err := s.cartProductRepo.Create(ctx, cartProduct); err != nil {
		return nil, fmt.Errorf("error al agregar producto al carrito: %w", err)
	}

	return map[string]any{
		"id":        cartProduct.ID.String(),
		"productId": product.ID.String(),
	}, nil
}

// resolveCartProductID parses a cart product id, falling back to resolving a
// client-side local id (e.g. "local_...") against the owning user's cart
// products so update/delete sync ops sent before the insert was reconciled
// still apply.
func (s *syncService) resolveCartProductID(ctx context.Context, userID uuid.UUID, idStr string) (uuid.UUID, error) {
	id, err := uuid.Parse(idStr)
	if err == nil {
		return id, nil
	}

	resolved, findErr := s.cartProductRepo.FindByLocalID(ctx, userID, idStr)
	if findErr != nil {
		return uuid.Nil, fmt.Errorf("ID de producto de carrito inválido")
	}
	return resolved.ID, nil
}

func (s *syncService) handleCartProductUpdate(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (map[string]any, error) {
	idStr, ok := op.Payload["id"].(string)
	if !ok {
		return nil, fmt.Errorf("ID de producto de carrito requerido")
	}

	id, err := s.resolveCartProductID(ctx, userID, idStr)
	if err != nil {
		return nil, err
	}

	existing, err := s.cartProductRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, apperrors.ErrNotFound) {
			return nil, fmt.Errorf("producto de carrito no encontrado")
		}
		return nil, fmt.Errorf("error al buscar producto: %w", err)
	}

	if quantity, ok := op.Payload["quantity"].(float64); ok {
		existing.Quantity = int(quantity)
	}

	if err := s.cartProductRepo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("error al actualizar producto: %w", err)
	}

	return nil, nil
}

func (s *syncService) handleCartProductDelete(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) error {
	idStr, ok := op.Payload["id"].(string)
	if !ok {
		return fmt.Errorf("ID de producto de carrito requerido")
	}

	id, err := s.resolveCartProductID(ctx, userID, idStr)
	if err != nil {
		return err
	}

	return s.cartProductRepo.Delete(ctx, id)
}

func (s *syncService) processUserOperation(ctx context.Context, userID uuid.UUID, op dto.SyncOperation) (bool, string) {
	opUserID, ok := op.Payload["id"].(string)
	if !ok {
		return false, "ID de usuario inválido"
	}

	parsedUserID, err := uuid.Parse(opUserID)
	if err != nil {
		return false, "formato de ID de usuario inválido"
	}

	if parsedUserID != userID {
		return false, "no autorizado"
	}

	switch op.Action {
	case dto.SyncOpInsert:
		return false, "registro de usuario no permitido via sync"
	case dto.SyncOpUpdate:
		user, err := s.userRepo.FindByID(ctx, parsedUserID)
		if err != nil {
			return false, err.Error()
		}

		// Only email and name are client-settable here. Premium and anonymous
		// flags are managed server-side (payment approval + the session
		// middleware), so client-supplied values are rejected to prevent
		// self-granting premium.
		if email, ok := op.Payload["email"].(string); ok {
			user.Email = email
		}
		if name, ok := op.Payload["name"].(string); ok {
			user.Name = models.TruncateName(name)
		}

		if err := s.userRepo.Update(ctx, user); err != nil {
			return false, err.Error()
		}
		return true, ""
	case dto.SyncOpDelete:
		if err := s.userRepo.Delete(ctx, parsedUserID); err != nil {
			return false, err.Error()
		}
		return true, ""
	default:
		return false, "acción desconocida"
	}
}
