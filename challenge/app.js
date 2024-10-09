const express = require('express')
const db = require('./db')
const app = express()
app.use(express.json());
const port = 3000

function validateQuery(query) {
    return !(!query || !query.date 
      || !query.products || !query.products.length 
      || !query.language || !query.rating);
}

const searchQuery =
`SELECT count(inn.id)::int as available_count, open_slots.start_date FROM (
	SELECT id, products, languages, customer_ratings FROM sales_managers
	WHERE products @> $1 AND $2 = ANY(languages) AND $3 = ANY(customer_ratings)
) AS inn
INNER JOIN slots as open_slots
	ON inn.id = open_slots.sales_manager_id
	AND open_slots.booked = false
  AND open_slots.start_date::date = to_date($4, 'YYYY-MM-DD')
  AND open_slots.end_date::date = to_date($4, 'YYYY-MM-DD')
LEFT OUTER JOIN slots as booked_slots
	ON inn.id = booked_slots.sales_manager_id
	AND booked_slots.booked = true
  AND booked_slots.start_date::date = to_date($4, 'YYYY-MM-DD')
  AND booked_slots.end_date::date = to_date($4, 'YYYY-MM-DD')
AND ((open_slots.start_date, open_slots.end_date) OVERLAPS (booked_slots.start_date, booked_slots.end_date))
WHERE booked_slots.start_date IS NULL
group by open_slots.start_date`;


app.post('/calendar/query', (req, res) => {
	if (!validateQuery(req.body)) return res.sendStatus(400)
  const products = '{"' + req.body.products.join('", "') + '"}';

  db.any(searchQuery, [products, req.body.language, req.body.rating, req.body.date])
  .then(function(data) {
      console.error('data found. ' + JSON.stringify(data))
      res.send(data)
  })
  .catch(function(error) {
    res.sendStatus(500)
  })
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
