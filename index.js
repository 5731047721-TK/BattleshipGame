const express = require('express');
const App = require('./app');
const app = App.app;

const PORT = 1337;

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}!`);
});