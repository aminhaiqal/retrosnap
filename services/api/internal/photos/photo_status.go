package photos

type UploadStatus string

const (
	UploadStatusPresigned  UploadStatus = "presigned"
	UploadStatusUploaded   UploadStatus = "uploaded"
	UploadStatusProcessing UploadStatus = "processing"
	UploadStatusProcessed  UploadStatus = "processed"
	UploadStatusFailed     UploadStatus = "failed"
	UploadStatusHidden     UploadStatus = "hidden"
)
