export const serverCheck = (req, res) => {
  console.log("server check req hit")
  res.status(200).json({
    success: true,
    message: "🚀 Server is running fine!",
    timestamp: new Date().toISOString(),
  });
};