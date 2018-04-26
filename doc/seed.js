module.exports = [
  {
    name: "info",
    tables: [
      {
        name: "users",
        primaryKey: "id",
        indexes: [
          {
            name: "hello"
          }
        ],
        documents: [
          {
            object: {
              id: "1234567890",
              token: "123",
              access: "123",
              refresh: "123",
              settings: { hide: true }
            }
          }
        ]
      }
    ]
  }
];
