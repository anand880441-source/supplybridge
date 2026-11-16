// Handles requests that do not match any route.
const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

// Central error handler for unexpected server errors.
// Express needs all four parameters to recognise this as an error handler,
// so "next" must stay even though we do not call it.
const errorHandler = (error, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";
  const reportedStatus = Number(error.statusCode || error.status || 0);
  let statusCode =
    Number.isInteger(reportedStatus) &&
    reportedStatus >= 400 &&
    reportedStatus <= 599
      ? reportedStatus
      : 500;
  let message = error.message || "Something went wrong on the server";

  if (error.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large";
  } else if (error.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Malformed JSON body";
  } else if (error.type === "entity.verify.failed") {
    statusCode = 403;
    message = "Request body could not be verified";
  }

  if (statusCode >= 500) {
    console.error(
      "Unexpected server error:",
      req.method,
      req.originalUrl,
      error
    );

    if (isProduction) {
      message = "Something went wrong on the server";
    }
  }

  return res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
