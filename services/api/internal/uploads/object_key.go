package uploads

import (
	"fmt"
	"regexp"

	"github.com/google/uuid"
)

var objectKeyPartPattern = regexp.MustCompile(`^[A-Za-z0-9._-]+$`)

func ValidateObjectKeyPart(value string) bool {
	return objectKeyPartPattern.MatchString(value)
}

func GenerateObjectKey(eventID string, guestSessionID uuid.UUID, localPhotoID string) string {
	return fmt.Sprintf("events/%s/originals/%s/%s.jpg", eventID, guestSessionID.String(), localPhotoID)
}
