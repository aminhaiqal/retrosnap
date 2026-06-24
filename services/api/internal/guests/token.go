package guests

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strings"
)

func GenerateGuestToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate guest token: %w", err)
	}

	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

func HashGuestToken(secret string, token string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(token))
	return hex.EncodeToString(mac.Sum(nil))
}

func BearerToken(authorizationHeader string) (string, bool) {
	value := strings.TrimSpace(authorizationHeader)
	token, ok := strings.CutPrefix(value, "Bearer ")
	if !ok {
		return "", false
	}

	token = strings.TrimSpace(token)
	return token, token != ""
}
