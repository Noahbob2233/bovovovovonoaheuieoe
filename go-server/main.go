package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{} // use default options

func api(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "X")
}

func stream(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
	defer c.Close()
	for {
		mt, message, err := c.ReadMessage()
		if err != nil {
			log.Println("read:", err)
			break
		}
		log.Printf("recv: %s", message)
		err = c.WriteMessage(mt, message)
		if err != nil {
			log.Println("write:", err)
			break
		}
	}
}

func main() {
	// fs := http.FileServer(http.Dir("../client/dist/rpnow"))
	// http.Handle("/", fs)
	http.HandleFunc("/api", api)
	http.HandleFunc("/stream", stream)
	err := http.ListenAndServe(":8989", nil)
	log.Fatal(err)
}
