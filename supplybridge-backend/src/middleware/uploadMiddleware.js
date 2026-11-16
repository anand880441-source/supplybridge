const fs = require("fs");
const path = require("path");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
const PRIVATE_UPLOAD_DIR = path.join(
  __dirname,
  "..",
  "..",
  "private-uploads",
  "business-documents"
);
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOCUMENT_MIME_TYPES = [...ALLOWED_MIME_TYPES, "application/pdf"];
const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf"
};

const buildImageStorage = (subdirectory, prefix) => {
  const destinationDir = path.join(UPLOAD_DIR, subdirectory);

  return multer.diskStorage({
    destination: (req, file, callback) => {
      fs.mkdirSync(destinationDir, { recursive: true });
      callback(null, destinationDir);
    },
    filename: (req, file, callback) => {
      const extension = MIME_EXTENSIONS[file.mimetype] || ".jpg";
      const uniqueName = `${prefix}-${Date.now()}-${Math.round(
        Math.random() * 1000000000
      )}${extension}`;

      callback(null, uniqueName);
    }
  });
};

const imageFilter = (req, file, callback) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(new Error("Only JPG, PNG, or WebP images are allowed"));
    return;
  }

  callback(null, true);
};

const documentFilter = (req, file, callback) => {
  if (!DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    callback(new Error("Only PDF, JPG, PNG, or WebP files are allowed"));
    return;
  }

  callback(null, true);
};

const readFileHeader = (filePath) => {
  let descriptor;

  try {
    descriptor = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(12);
    const bytesRead = fs.readSync(descriptor, buffer, 0, 12, 0);

    return buffer.subarray(0, bytesRead);
  } catch (error) {
    return null;
  } finally {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch {}
    }
  }
};

const hasValidSignature = (header, mimetype) => {
  if (!header) {
    return false;
  }

  if (mimetype === "image/jpeg") {
    return (
      header.length >= 3 &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff
    );
  }

  if (mimetype === "image/png") {
    return (
      header.length >= 8 &&
      header.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      )
    );
  }

  if (mimetype === "image/webp") {
    return (
      header.length >= 12 &&
      header.toString("ascii", 0, 4) === "RIFF" &&
      header.toString("ascii", 8, 12) === "WEBP"
    );
  }

  if (mimetype === "application/pdf") {
    return header.length >= 5 && header.toString("ascii", 0, 5) === "%PDF-";
  }

  return false;
};

const isValidUploadedFile = (file) => {
  if (!file?.path) {
    return false;
  }

  return hasValidSignature(readFileHeader(file.path), file.mimetype);
};

const areValidUploadedFiles = (files) => {
  return (files || []).every(isValidUploadedFile);
};

const multerUpload = multer({
  storage: buildImageStorage(".", "requirement"),
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3
  }
});

const businessLogoUpload = multer({
  storage: buildImageStorage("business-logos", "logo"),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }
});

const portfolioUpload = multer({
  storage: buildImageStorage("portfolio", "portfolio"),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});

const documentStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    fs.mkdirSync(PRIVATE_UPLOAD_DIR, { recursive: true });
    callback(null, PRIVATE_UPLOAD_DIR);
  },
  filename: (req, file, callback) => {
    const extension = MIME_EXTENSIONS[file.mimetype] || ".pdf";
    const uniqueName = `document-${Date.now()}-${Math.round(
      Math.random() * 1000000000
    )}${extension}`;

    callback(null, uniqueName);
  }
});

const documentUpload = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 }
});

const removeFiles = (files) => {
  (files || []).forEach((file) => {
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      // The file may already be removed; nothing else to do.
    }
  });
};

const removeFile = (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    // Missing files can be ignored safely.
  }
};

const resolveUploadError = (error, fallback, maxFiles) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return fallback.sizeMessage;
    }

    if (
      error.code === "LIMIT_FILE_COUNT" ||
      error.code === "LIMIT_UNEXPECTED_FILE"
    ) {
      return maxFiles;
    }

    return error.message;
  }

  return error.message || fallback.genericMessage;
};

const createUploadHandler = ({
  uploader,
  field,
  maxFiles,
  sizeMessage,
  genericMessage
}) => {
  return (req, res, next) => {
    uploader.single(field)(req, res, (error) => {
      if (!error) {
        if (req.file && !isValidUploadedFile(req.file)) {
          removeFile(req.file.path);

          res.status(400).json({
            success: false,
            message: "The uploaded file does not match its declared type"
          });
          return;
        }

        next();
        return;
      }

      removeFiles(req.file ? [req.file] : []);

      res.status(400).json({
        success: false,
        message: resolveUploadError(
          error,
          { sizeMessage, genericMessage },
          maxFiles
        )
      });
    });
  };
};

// Wraps multer so upload errors become normal JSON error responses
// instead of crashing the request.
const uploadRequirementImages = (req, res, next) => {
  multerUpload.array("images", 3)(req, res, (error) => {
    if (!error) {
      if (!areValidUploadedFiles(req.files)) {
        removeFiles(req.files);

        res.status(400).json({
          success: false,
          message: "One or more images are not valid JPG, PNG, or WebP files"
        });
        return;
      }

      next();
      return;
    }

    removeFiles(req.files);

    const message = resolveUploadError(
      error,
      {
        sizeMessage: "Each image must be 5 MB or smaller",
        genericMessage: "Unable to upload the images"
      },
      "You can upload up to 3 images"
    );

    res.status(400).json({
      success: false,
      message
    });
  });
};

const uploadBusinessLogo = createUploadHandler({
  uploader: businessLogoUpload,
  field: "logo",
  maxFiles: "Only one logo can be uploaded",
  sizeMessage: "Logo must be 2 MB or smaller",
  genericMessage: "Unable to upload the logo"
});

const uploadPortfolioImage = createUploadHandler({
  uploader: portfolioUpload,
  field: "image",
  maxFiles: "Only one portfolio image can be uploaded",
  sizeMessage: "Portfolio image must be 5 MB or smaller",
  genericMessage: "Unable to upload the portfolio image"
});

const uploadVerificationDocument = createUploadHandler({
  uploader: documentUpload,
  field: "document",
  maxFiles: "Only one verification document can be uploaded",
  sizeMessage: "Verification document must be 8 MB or smaller",
  genericMessage: "Unable to upload the verification document"
});

module.exports = {
  PRIVATE_UPLOAD_DIR,
  removeFile,
  removeFiles,
  UPLOAD_DIR,
  uploadBusinessLogo,
  uploadPortfolioImage,
  uploadRequirementImages,
  uploadVerificationDocument
};
