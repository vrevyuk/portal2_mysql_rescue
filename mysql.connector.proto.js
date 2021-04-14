/**
 * Created by Vitaly Revyuk on 3/14/18.
 */

const mysql = require('mysql');

function MySQLFactory(props) {
	// console.log(`==================> Create pool for `, props);
	this.connected = false;

	this.checkConnection = () => this.connected

	this.pool = mysql.createPool(props);
	
	this.pool.on('connection', function(connection) {
		this.connected = true;
		connection.query(props.initialQuery, function(error, result) {
			if (error) {
				console.error(error)
			} else {
				console.log(`MySQL initial query done.`);
			}
		});
	
		this.connected = true;
		console.log(`MySQL connection to ${props.host} established.`, connection.threadId);
	});
	
	try2connect = () => {
		this.pool.getConnection((err, connection) => {
			if (err) console.log(`Cant establish connection to ${props.host} MySQL server. Error code:`, err.code);
			if (err) return;
			this.connected = true;
			connection.release();
		});
	};
	
	indicateFatalError = () => {
		throw(new Error(`MySQL connection for ${props.host} is not available.`));
	}
	
	try2connect();

	this.query = (query, params) => {
		if (!this.connected) {
			try2connect();
			indicateFatalError();
		};
	
		return new Promise((resolve, reject) => {
			this.pool.getConnection(function (error, connection) {
				if (error && error.fatal && error.code === 'ETIMEDOUT') this.connected = false;
				if (error) return reject(error);
	
				connection.query(query, params, function (error, result) {
					if (error) {
						connection.release();
						return reject(error);
					}
	
					resolve(result);
					connection.release();
				});
			})
		});
	};
	
	this.startTransaction = () => {
		if (!this.connected) {
			try2connect();
			indicateFatalError();
		};
	
		return new Promise((resolve, reject) => {
			this.pool.getConnection(function (error, connection) {
				if (error && error.fatal && error.code === 'ETIMEDOUT') this.connected = false;
				if (error) return reject(error);
	
				connection.beginTransaction(function (error) {
					if (error) return reject(error);
					resolve(connection);
				});
			})
		});
	};
	
	this.queryTransaction = (connection, query, params) => {
		if (!this.connected) {
			try2connect();
			indicateFatalError();
		};
	
		return new Promise((resolve, reject) => {
			connection.query(query, params, function (error, result) {
				if (error && error.fatal && error.code === 'ETIMEDOUT') connected = false;
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			});
		});
	};
	
	this.commitTransaction = (connection) => {
		if (!this.connected) {
			try2connect();
			indicateFatalError();
		};
	
		return new Promise(function (resolve, reject) {
			connection.commit(function (error) {
				if (error && error.fatal && error.code === 'ETIMEDOUT') this.connected = false;
				if (error) {
					connection.rollback(function (rollbackError) {
						return reject(rollbackError || error);
					});
				} else {
					connection.release();
					resolve();
				}
			});
		});
	};
	
	this.rollbackTransaction = (connection) => {
		if (!this.connected) {
			try2connect();
			indicateFatalError();
		};
	
		return new Promise((resolve, reject) => {
			connection.rollback((error) => {
				if (error && error.fatal && error.code === 'ETIMEDOUT') this.connected = false;
				connection.release();
				resolve();
			});
		});
	};
	
	this.closeAll = (cb) => {
		this.pool.end((error) => {
			typeof cb === "function" && cb(error);
		})
	};
}

MySQLFactory.prototype.escape = mysql.escape;

MySQLFactory.prototype.format = mysql.format;

module.exports = MySQLFactory;
