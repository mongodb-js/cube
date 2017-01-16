#!/usr/bin/env node

const express = require('express');
const mongodb = require('mongodb');



var event = require('../lib/event');

app.post('/api/v1/event', function(req, res) {
  req.body
  res.status(200).send('ok');
});
