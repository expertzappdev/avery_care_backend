export const serverCheck = (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 Server is running fine!",
    timestamp: new Date().toISOString(),
  });
};