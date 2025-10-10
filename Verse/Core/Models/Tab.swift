//
//  Tab.swift
//  Arc
//
//  Created by Shreyas Gurav on 09/10/25.
//

import Foundation

struct Tab: Identifiable, Equatable {
    let id: UUID
    var title: String
    var url: String
    
    init(id: UUID = UUID(), title: String = "New Tab", url: String = "https://www.google.com") {
        self.id = id
        self.title = title
        self.url = url
    }
    
    static func == (lhs: Tab, rhs: Tab) -> Bool {
        lhs.id == rhs.id
    }
}

