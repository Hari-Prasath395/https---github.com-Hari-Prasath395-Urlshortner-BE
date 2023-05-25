const shortUrlRouter = require('express').Router();
const urlModel = require('../Models/urlShort.Model');
const { generateRandomUrl } = require('../Utils/urlUtils');

shortUrlRouter.post('/createShortUrl', async (req, res) => {
  try {
    const shortUrl = new urlModel({
      longUrl: req.body.longUrl,
      shortUrl: generateRandomUrl()
    });

    await shortUrl.save();

    res.status(200).json({
      success: true,
      message: "Short URL generated successfully!",
      data: shortUrl
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "An error occurred while generating short URL."
    });
  }
});

// Route to get all URLs
shortUrlRouter.get('/urls', async (req, res) => {
  try {
    const urls = await urlModel.find(); // Fetch all URLs from the database

    res.json(urls); // Send the URLs as a JSON response
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

shortUrlRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUrl = await urlModel.findByIdAndDelete(id);
    if (!deletedUrl) {
      return res.status(404).json({ error: 'URL not found' });
    }

    res.json({ message: 'URL deleted successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'error in deleting the URL' });
  }
});

module.exports = shortUrlRouter;
