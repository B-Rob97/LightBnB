const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require('pg');

const pool = new Pool({
  user: 'labber',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1`, [email])
    .then((result) => {
      const user = result.rows[0];
      return Promise.resolve(user || null);
    })
    .catch((err) => {
      console.log('ERROR:', err.message);
      return Promise.reject(err);
    });
};


/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((result) => {
      const user = result.rows[0];
      return Promise.resolve(user);
    })
    .catch((err) => {
      console.log('ERROR:', err.message);
      return Promise.reject(err);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  return pool
    .query(`INSERT INTO users(name, email, password) VALUES ($1, $2, $3) RETURNING *;`, [user.name, user.email, user.password])
    .then((result) => {
      const newUser = result.row;
      return Promise.resolve(newUser);
    })
    .catch((err) => {
      console.log("ERROR:", err.message);
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  return pool
    .query(`
  SELECT reservations.id, properties.title, properties.cost_per_night, reservations.start_date, avg(rating) as average_rating, properties.thumbnail_photo_url
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`, [guest_id, limit])
    .then((result) => {
      console.log("result.row: ", result.rows);
      const reservations = result.rows;
      return Promise.resolve(reservations);
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  const queryParams = [];
  let queryString = `
    SELECT properties.*, AVG(property_reviews.rating) AS average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
  `;

  const whereConditions = [];

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    whereConditions.push(`city LIKE $${queryParams.length}`);
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    whereConditions.push(`owner_id = $${queryParams.length}`);
  }

  if (options.minimum_price_per_night !== undefined) {
    queryParams.push(options.minimum_price_per_night * 100);
    whereConditions.push(`cost_per_night >= $${queryParams.length}`);
  }

  if (options.maximum_price_per_night !== undefined) {
    queryParams.push(options.maximum_price_per_night * 100);
    whereConditions.push(`cost_per_night <= $${queryParams.length}`);
  }

  if (options.minimum_rating !== undefined) {
    queryParams.push(options.minimum_rating);
  }

  if (whereConditions.length > 0) {
    queryString += 'WHERE ' + whereConditions.join(' AND ') + ' ';
  }

  queryString += `
    GROUP BY properties.id
  `;

  if (options.minimum_rating !== undefined) {
    queryString += ` HAVING AVG(property_reviews.rating) >= $${queryParams.length}`;
  }

  queryParams.push(limit);
  queryString += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;

  console.log("Query String:", queryString, "Query Params:", queryParams);

  return pool.query(queryString, queryParams).then((res) => res.rows);
};




/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
